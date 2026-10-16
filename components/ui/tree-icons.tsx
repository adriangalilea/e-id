// The icons a tree of files and places wears, usable anywhere else too. A file's icon
// is read from its kind, and its kind from its mime type when there is one, else
// from its extension; a folder is open or closed. Places and layer verbs are a fixed
// set under plain names (`disk`, `phone`, `eye`), so a caller never hunts lucide for
// "the offline drive". Every icon is lucide's, drawn in currentColor.

import {
  Archive,
  Camera,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  File,
  FileArchive,
  FileAudio,
  FileBraces,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  FolderOpen,
  Frame,
  Group,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Lock,
  LockOpen,
  type LucideIcon,
  ServerOff,
  Smartphone,
  Square,
  Star,
  Tag,
  Tags,
  Trash2,
  Type,
  Usb,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type FileKind =
  | "video"
  | "image"
  | "audio"
  | "code"
  | "data"
  | "text"
  | "sheet"
  | "archive"
  | "pdf"
  | "font"
  | "file"

/** Extension → kind. Lowercase, without the dot. */
const BY_EXTENSION: Record<string, FileKind> = {}
const add = (kind: FileKind, exts: string) => {
  for (const e of exts.split(" ")) BY_EXTENSION[e] = kind
}
add("video", "mp4 m4v mov mkv webm avi wmv flv mts m2ts mpg mpeg 3gp ogv")
add(
  "image",
  "jpg jpeg png gif webp avif heic heif tif tiff bmp svg ico raw dng cr2 cr3 nef arw raf orf rw2 psd exr",
)
add("audio", "mp3 wav flac aac m4a ogg oga opus aif aiff alac wma mid midi")
add(
  "code",
  "ts tsx js jsx mjs cjs go rs py rb swift kt java c h cc cpp hpp cs php lua zig sh bash zsh fish ps1 sql html htm css scss sass less vue svelte astro dart scala ex exs hs ml clj",
)
add("data", "json jsonl ndjson yaml yml toml xml plist ini env lock")
add("text", "txt md mdx markdown rtf log tex org rst srt vtt ass")
add("sheet", "csv tsv xls xlsx numbers ods")
add("archive", "zip rar 7z tar gz tgz bz2 xz zst dmg iso pkg deb rpm jar")
add("pdf", "pdf")
add("font", "ttf otf woff woff2")

/** Mime prefixes and exact types that name a kind outright. */
function kindOfMime(mime: string): FileKind | undefined {
  const m = mime.toLowerCase()
  if (m.startsWith("video/")) return "video"
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("audio/")) return "audio"
  if (m.startsWith("font/")) return "font"
  if (m === "application/pdf") return "pdf"
  if (m.includes("json") || m.includes("yaml") || m.includes("xml"))
    return "data"
  if (m.includes("zip") || m.includes("tar") || m.includes("compressed"))
    return "archive"
  if (m.includes("spreadsheet") || m === "text/csv") return "sheet"
  if (m.includes("javascript") || m.includes("typescript")) return "code"
  if (m.startsWith("text/")) return "text"
  return undefined
}

/** What a file is, from its mime type when known, else its extension. */
export function kindOf(name: string, mime?: string): FileKind {
  const fromMime = mime ? kindOfMime(mime) : undefined
  if (fromMime) return fromMime
  const dot = name.lastIndexOf(".")
  if (dot <= 0) return "file"
  return BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? "file"
}

const KIND_ICON: Record<FileKind, LucideIcon> = {
  video: FileVideo,
  image: FileImage,
  audio: FileAudio,
  code: FileCode,
  data: FileBraces,
  text: FileText,
  sheet: FileSpreadsheet,
  archive: FileArchive,
  pdf: FileType,
  font: Type,
  file: File,
}

/** The icon for a file or folder by name: a folder open or closed, a file by kind. */
export function iconFor(
  name: string,
  opts: { folder?: boolean; open?: boolean; mime?: string } = {},
): LucideIcon {
  if (opts.folder) return opts.open ? FolderOpen : Folder
  return KIND_ICON[kindOf(name, opts.mime)]
}

/** A file or folder's icon as an element: `<FileIcon name="clip.mov" />`. */
export function FileIcon({
  name,
  folder,
  open,
  mime,
  className,
}: {
  name: string
  folder?: boolean
  open?: boolean
  mime?: string
  className?: string
}) {
  const Icon = iconFor(name, { folder, open, mime })
  return (
    <Icon
      aria-hidden
      data-slot="file-icon"
      className={cn("size-3.5 shrink-0", className)}
    />
  )
}

/** The places and verbs a sidebar or a layers panel names, under plain names. */
export const ICONS = {
  disk: HardDrive,
  diskOffline: ServerOff,
  usb: Usb,
  phone: Smartphone,
  camera: Camera,
  cloud: Cloud,
  cloudOffline: CloudOff,
  trash: Trash2,
  archive: Archive,
  star: Star,
  tag: Tag,
  tags: Tags,
  layers: Layers,
  group: Group,
  frame: Frame,
  shape: Square,
  image: ImageIcon,
  text: Type,
  eye: Eye,
  eyeOff: EyeOff,
  lock: Lock,
  unlock: LockOpen,
  folder: Folder,
  folderOpen: FolderOpen,
  file: File,
} satisfies Record<string, LucideIcon>
