import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ASPECT_DIMENSIONS, type AspectRatio, type TransitionType } from "@vendefacil/types";

export type RenderScene = {
  imagePath: string;
  durationMs: number;
  zoom: number;
  panX: number;
  panY: number;
  headline: string;
  caption: string;
  transition: TransitionType;
};

export type RenderRequest = {
  renderId: string;
  aspectRatio: AspectRatio;
  scenes: RenderScene[];
  narrationPath?: string;
  musicPath?: string;
  narrationVolume: number;
  musicVolume: number;
  ffmpegPath: string;
  fontPath?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

function run(command: string, args: string[], signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    const onAbort = () => child.kill("SIGKILL");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) reject(new Error("CANCELLED"));
      else if (code === 0) resolve();
      else reject(new Error(stderr || `FFmpeg encerrou com código ${code}`));
    });
  });
}

function escapeDrawtext(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%").replace(/\n/g, " ");
}

export function buildSrt(scenes: Array<{ durationMs: number; caption: string }>) {
  let cursor = 0;
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = (ms: number) => {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    const millis = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${String(millis).padStart(3, "0")}`;
  };
  return scenes
    .filter((scene) => scene.caption.trim())
    .map((scene, index) => {
      const start = cursor;
      cursor += scene.durationMs;
      return `${index + 1}\n${stamp(start)} --> ${stamp(cursor)}\n${scene.caption.trim()}\n`;
    })
    .join("\n");
}

export async function renderPhotoVideo(input: RenderRequest) {
  const size = ASPECT_DIMENSIONS[input.aspectRatio];
  const dir = path.join(os.tmpdir(), "vendefacil", input.renderId);
  await fs.mkdir(dir, { recursive: true });
  const clips: string[] = [];
  try {
    for (const [index, scene] of input.scenes.entries()) {
      const frames = Math.max(30, Math.round((scene.durationMs / 1000) * 30));
      const clip = path.join(dir, `scene-${index}.mp4`);
      const zoom = Math.min(1.35, Math.max(1, scene.zoom));
      const font = input.fontPath ? `:fontfile='${input.fontPath.replace(/\\/g, "/").replace(":", "\\:")}'` : "";
      const filters = [
        `scale=${size.width * 3}:${size.height * 3}:force_original_aspect_ratio=increase`,
        `crop=${size.width * 3}:${size.height * 3}`,
        `zoompan=z='min(1+on*${((zoom - 1) / frames).toFixed(6)},${zoom})':x='iw/2-(iw/zoom/2)+${Math.round(scene.panX * 40)}*on':y='ih/2-(ih/zoom/2)+${Math.round(scene.panY * 24)}*on':d=${frames}:s=${size.width}x${size.height}:fps=30`,
      ];
      if (scene.headline) {
        filters.push(`drawtext=text='${escapeDrawtext(scene.headline.slice(0, 48))}'${font}:fontsize=42:fontcolor=white:borderw=2:bordercolor=black@0.45:x=(w-text_w)/2:y=h*0.12`);
      }
      if (scene.caption) {
        filters.push(`drawtext=text='${escapeDrawtext(scene.caption.slice(0, 90))}'${font}:fontsize=28:fontcolor=white:borderw=2:bordercolor=black@0.45:x=(w-text_w)/2:y=h*0.82`);
      }
      await run(input.ffmpegPath, [
        "-y",
        "-loop", "1",
        "-i", scene.imagePath,
        "-vf", filters.join(","),
        "-frames:v", String(frames),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-an",
        clip,
      ], input.signal);
      clips.push(clip);
      input.onProgress?.(30 + Math.round(((index + 1) / input.scenes.length) * 40));
    }

    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, clips.map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`).join("\n"));
    const silent = path.join(dir, "silent.mp4");
    await run(input.ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent], input.signal);

    const duration = input.scenes.reduce((sum, scene) => sum + scene.durationMs, 0) / 1000;
    const output = path.join(dir, "output.mp4");
    const args = ["-y", "-i", silent];
    const audioInputs: string[] = [];
    if (input.narrationPath) {
      args.push("-i", input.narrationPath);
      audioInputs.push("narration");
    }
    if (input.musicPath) {
      args.push("-i", input.musicPath);
      audioInputs.push("music");
    }
    if (!audioInputs.length) {
      args.push("-f", "lavfi", "-t", duration.toFixed(2), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
      args.push("-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output);
    } else {
      const filters: string[] = [];
      const mix: string[] = [];
      let audioIndex = 1;
      if (input.narrationPath) {
        filters.push(`[${audioIndex}:a]volume=${(input.narrationVolume / 100).toFixed(2)},atrim=0:${duration.toFixed(2)},apad[nar]`);
        mix.push("[nar]");
        audioIndex += 1;
      }
      if (input.musicPath) {
        filters.push(`[${audioIndex}:a]volume=${(input.musicVolume / 100).toFixed(2)},atrim=0:${duration.toFixed(2)},apad[mus]`);
        mix.push("[mus]");
      }
      filters.push(`${mix.join("")}amix=inputs=${mix.length}:duration=longest:dropout_transition=0[aout]`);
      args.push("-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[aout]", "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output);
    }
    await run(input.ffmpegPath, args, input.signal);
    const video = await fs.readFile(output);
    const srt = buildSrt(input.scenes);
    input.onProgress?.(92);
    return { video, srt, tempDir: dir };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
}

export async function cleanupRenderDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

export async function findFont(explicit?: string) {
  const candidates = [
    explicit,
    process.platform === "win32" ? "C:\\Windows\\Fonts\\arial.ttf" : undefined,
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ].filter((item): item is string => Boolean(item));
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}
