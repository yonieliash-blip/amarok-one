import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { badRequest } from "../../lib/errors.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const allowedCategories = new Set([
  "equipment",
  "hour_meter",
  "license_plate",
  "fault",
  "old_parts",
  "new_parts_installed",
  "old_and_new_parts",
]);

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

function configuredBucket(): string {
  const bucket = process.env.REPAIR_ORDER_S3_BUCKET?.trim();
  if (!bucket) {
    throw badRequest("אחסון הצילומים אינו מוגדר עדיין ב־Staging.");
  }
  return bucket;
}

function extensionFor(contentType: string): string {
  return (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
    }[contentType] ?? "image"
  );
}

export function hasExpectedImageSignature(contentType: string, bytes: Buffer): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }

  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).equals(Buffer.from("RIFF")) &&
      bytes.subarray(8, 12).equals(Buffer.from("WEBP"))
    );
  }

  if (contentType === "image/heic") {
    const brand = bytes.subarray(8, 12).toString("ascii");
    return (
      bytes.length >= 12 &&
      bytes.subarray(4, 8).equals(Buffer.from("ftyp")) &&
      ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)
    );
  }

  return false;
}

export function assertImageUpload(category: string, file: Pick<File, "type">, bytes: Buffer): void {
  if (!allowedCategories.has(category)) throw badRequest("סוג צילום הזמנת התיקון אינו תקין.");
  if (!allowedMimeTypes.has(file.type))
    throw badRequest("ניתן להעלות צילום JPG, PNG, WEBP או HEIC בלבד.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw badRequest("גודל צילום הזמנת התיקון חייב להיות עד 8MB.");
  }
  // Browser MIME labels are client-controlled, so verify the file signature before storing it.
  if (!hasExpectedImageSignature(file.type, bytes)) {
    throw badRequest("תוכן הצילום אינו תואם לסוג הקובץ שנבחר.");
  }
}

export async function uploadRepairOrderPhoto(input: {
  organizationId: string;
  workReportId: string;
  category: string;
  file: File;
}): Promise<{
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}> {
  const bytes = Buffer.from(await input.file.arrayBuffer());
  assertImageUpload(input.category, input.file, bytes);

  const storageKey = `repair-orders/${input.organizationId}/${input.workReportId}/${crypto.randomUUID()}.${extensionFor(input.file.type)}`;
  const client = new S3Client({ region: process.env.AWS_REGION?.trim() || "eu-central-1" });
  await client.send(
    new PutObjectCommand({
      Bucket: configuredBucket(),
      Key: storageKey,
      Body: bytes,
      ContentType: input.file.type,
      ServerSideEncryption: "AES256",
      Metadata: {
        organizationid: input.organizationId,
        workreportid: input.workReportId,
        category: input.category,
      },
    }),
  );

  return {
    storageKey,
    fileName: input.file.name || `repair-order.${extensionFor(input.file.type)}`,
    contentType: input.file.type,
    byteSize: bytes.byteLength,
  };
}
