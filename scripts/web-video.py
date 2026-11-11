"""Encode a video for the site: a web-safe .mp4 plus a .jpg poster.

    python scripts/web-video.py <input> <output-folder> [--name clip] [--height 1080]
                                [--sound] [--crf 23] [--fps 30] [--poster-at 0.5]

Examples
    python scripts/web-video.py "D:/renders/turntable.mov" work/deep-capture/media --name turntable
    python scripts/web-video.py "D:/renders/film.mov" work/deep-capture/media --name film --sound --height 1080

Output is H.264 / yuv420p with the index at the front of the file (faststart), which plays
in every current browser and starts before it has fully downloaded. Audio is removed unless
--sound is given: silent clips are allowed to autoplay, clips with sound are not.
Needs ffmpeg on PATH. Never touches the input file.
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("input")
ap.add_argument("outdir")
ap.add_argument("--name", help="output file name without extension (default: input name)")
ap.add_argument("--height", type=int, default=1080, help="maximum height in pixels (default 1080)")
ap.add_argument("--sound", action="store_true", help="keep the audio track (AAC 128k)")
ap.add_argument("--crf", type=int, default=23, help="quality: lower is better and bigger (default 23, try 20-28)")
ap.add_argument("--fps", type=int, default=30, help="maximum frame rate (default 30)")
ap.add_argument("--poster-at", type=float, default=0.5, help="seconds into the clip for the poster frame")
a = ap.parse_args()

if not shutil.which("ffmpeg"):
    sys.exit("ffmpeg was not found on PATH.")
src = pathlib.Path(a.input)
if not src.is_file():
    sys.exit(f"Input not found: {src}")
out = pathlib.Path(a.outdir)
out.mkdir(parents=True, exist_ok=True)
name = a.name or src.stem.lower().replace(" ", "-")
mp4, jpg = out / f"{name}.mp4", out / f"{name}.jpg"
if mp4.resolve() == src.resolve():
    sys.exit("Output would overwrite the input. Pick a different --name or folder.")

# Never upscale; keep even dimensions (H.264 needs them).
scale = f"scale=-2:'min({a.height},ih)':flags=lanczos,fps='min({a.fps},source_fps)'"
video = [
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
    "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf),
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
]
video += ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] if a.sound else ["-an"]
video += [str(mp4)]
poster = [
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(a.poster_at), "-i", str(mp4),
    "-frames:v", "1", "-q:v", "3", str(jpg),
]
for cmd in (video, poster):
    if subprocess.run(cmd).returncode:
        sys.exit("ffmpeg failed.")

mb = mp4.stat().st_size / 1e6
print(f"{mp4}  {mb:.1f} MB")
print(f"{jpg}  {jpg.stat().st_size / 1e3:.0f} KB")
if mb > 25:
    print("Note: over 25 MB. Consider a higher --crf, a lower --height, or a shorter clip.")
