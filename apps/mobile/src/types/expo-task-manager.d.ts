declare module "expo-task-manager" {
  export interface TaskManagerTaskBody<T> {
    data?: T;
    error: Error | null;
  }

  export function defineTask<T>(
    taskName: string,
    taskExecutor: (body: TaskManagerTaskBody<T>) => void | Promise<void>,
  ): void;
}
