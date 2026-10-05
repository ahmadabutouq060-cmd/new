/* Which image format is this, really?   Firebase Hosting sets Content-Type from the file extension, so a `.jpg`   holding WebP bytes is served as `image/jpeg` and the browser refuses to   decode it. Every writer under scripts/ therefore has to name a file from the   bytes it actually received rather than from whatever the manifest guessed,   and every merge has to be able to re-check what landed on disk.   The signatures are deliberately read from the file's own bytes and never   from a Content-Type header: a CDN that labels WebP as JPEG is common, and   trusting the header is how the mismatch gets created in the first place.   scripts/build.cjs keeps its own copy of these signatures. That duplication is   intentional: build.cjs is CommonJS and is the deploy gate, and a build gate   that fails because a shared module changed shape is worse than a list of   eight byte patterns written twice. Keep the two lists in step. */ import path from "node:path"
const ascii = (b, start, len) =>
  b.subarray(start, start + len).toString("latin1")
/* Ordered most-specific first. RIFF/WEBP is checked before anything else   because a WebP is a RIFF container and its leading bytes are only weakly   distinctive. */ export const SIGNATURES =
  [
    {
      format: "webp",
      ext: ".webp",
      mime: "image/webp",
      test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP",
    },
    {
      format: "png",
      ext: ".png",
      mime: "image/png",
      test: (b) => ascii(b, 0, 8) === "\x89PNG\r\n\x1a\n",
    },
    {
      format: "gif",
      ext: ".gif",
      mime: "image/gif",
      test: (b) => ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a",
    },
    {
      format: "jpeg",
      ext: ".jpg",
      mime: "image/jpeg",
      test: (b) =>
        b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    {
      format: "svg",
      ext: ".svg",
      mime: "image/svg+xml",
      test: (b) => /<svg[\s>]/i.test(ascii(b, 0, 512)),
    },
  ]
export function sniffFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null
  return SIGNATURES.find((s) => s.test(buffer)) || null
}
/* A Git LFS pointer is a text file that stands in for image bytes. Serving one   as an image yields a broken image and a confusing decode error, so it is   detected everywhere rather than only in the build. */ export const LFS_POINTER_PREFIX =
  "version https://git-lfs.github.com/spec/v1"
export function isLfsPointer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    ascii(buffer, 0, LFS_POINTER_PREFIX.length).startsWith(LFS_POINTER_PREFIX)
  )
}
export function extensionFor(format) {
  const hit = SIGNATURES.find((s) => s.format === format)
  return hit ? hit.ext : null
}
/* Rewrite a path's extension to the one the bytes actually deserve. Returns the   input unchanged when the extension is already right, so a caller can treat   "same path" as "nothing to do" when deciding whether anything changed. */ export function withCorrectExtension(
  filePath,
  buffer,
) {
  const sig = sniffFormat(buffer)
  if (!sig)
    return {
      path: filePath,
      format: null,
      corrected: false,
      reason: "unrecognised bytes",
    }
  const current = path.extname(filePath).toLowerCase()
  if (current === sig.ext)
    return { path: filePath, format: sig, corrected: false }
  const fixed = filePath.slice(0, filePath.length - current.length) + sig.ext
  return { path: fixed, format: sig, corrected: true, from: current }
}
