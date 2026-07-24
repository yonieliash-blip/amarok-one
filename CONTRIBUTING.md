# Contributing to AMAROK ONE

Thank you for contributing to AMAROK ONE! This guide will help you understand how to work with this repository.

## Branching Strategy

We follow a simple branching model:

- **`main`**: Production-ready code. Only stable, reviewed code is merged here.
- **`develop`**: Development integration branch.
- **`feature/*`**: For new features (e.g., `feature/user-management`)
- **`fix/*`**: For bug fixes (e.g., `fix/login-issue`)

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the project's code style
- Include comments for complex logic
- Test your changes locally

### 3. Commit Your Changes

```bash
git add .
git commit -m "Description of your changes"
```

Use clear, descriptive commit messages:

- ✅ Good: `Add user authentication form validation`
- ❌ Bad: `Fix stuff`

### 4. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request (PR) on GitHub with:

- A clear title describing the changes
- A description of what was changed and why
- Reference to any related issues

### 5. Code Review

Review your own code before merging:

- Does it solve the problem?
- Is it maintainable?
- Are there any edge cases?
- Could it break anything?

### 6. Merge

Once everything looks good, merge the PR:

- Use "Squash and merge" to keep history clean
- Delete the feature branch after merging

## Code Style

- Use TypeScript for type safety
- Follow React best practices
- Keep components small and focused
- Use meaningful variable names
- Add comments for unclear code

## Testing

Before pushing:

- Test your changes thoroughly
- Check for console errors
- Test on different screen sizes (for UI changes)

## Documentation

If you make significant changes:

- Update relevant documentation in `docs/`
- Update this README if needed
- Add comments to complex code

## Questions?

If you have questions, open an issue on GitHub or check the documentation in the `docs/` folder.

Happy coding! 🚀
