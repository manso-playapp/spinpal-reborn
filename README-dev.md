# Workarounds for Firebase Hosting build

This project is configured for Next.js and Firebase Hosting, but the Firebase Hosting build process has exhibited some unusual behaviors related to TypeScript type checking.

## Problem: Type errors related to `PageProps`

The Firebase Hosting build process incorrectly identifies type errors related to `PageProps`, even though the code may be valid according to standard Next.js and TypeScript conventions.

Specifically, the build process may complain about a type mismatch or try to enforce a specific type constraint on the `params` prop that is not expected.

## Workaround: Using `@ts-ignore` and explicit types

To resolve this issue and allow the build to complete, apply the following steps:

1.  **Remove all imports of `PageProps` from `next/types`** in the files that generate a type build error.
2.  **Add `// @ts-ignore` before the function declaration of the page component**
3.  **Type props in the page component as any { params: any }**: For example:

```typescript
// @ts-ignore
export default async function MyPage({ params }: { params: any }) {
  // ...
}
```

This workaround disables type checking for the specific line, allowing the build to proceed while still having as much safety as possible.

## Recommendation

It is recommended to keep this README up to date and remove the `#ts-ignore` and the "any" type when the Firebase Hosting platform provides a fix.

If you encounter further problems with the build process, consult the Firebase Hosting documentation and support resources for potential solutions.