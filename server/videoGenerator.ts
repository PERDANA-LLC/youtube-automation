/**
 * Video Generator - Creates actual MP4 videos from AI-generated keyframe images
 * Uses ffmpeg to stitch images with Ken Burns effects and crossfade transitions
 */
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

const WORK_DIR = "/tmp/video-gen";

function ensureWorkDir() {
  if (!existsSync(WORK_DIR)) {
    mkdirSync(WORK_DIR, { recursive: true });
  }
}

function cleanupFiles(files: string[]) {
  for (const f of files) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {}
  }
}

/**
 * Download an image from URL and save to local file
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

/**
 * Generate keyframe images for each clip in the plan
 */
export async function generateKeyframes(
  clipPlan: Array<{ clipNumber: number; sceneDescription: string; cameraMovement: string }>,
  styleNotes: string,
  onProgress?: (clipNum: number, total: number) => void
): Promise<string[]> {
  const imageUrls: string[] = [];

  for (let i = 0; i < clipPlan.length; i++) {
    const clip = clipPlan[i];
    onProgress?.(i + 1, clipPlan.length);

    try {
      const { url } = await generateImage({
        prompt: `${styleNotes}. ${clip.sceneDescription}. ${clip.cameraMovement}. Cinematic 16:9 frame, high quality, photorealistic, no text, no watermarks, no logos, no UI elements, no annotations`,
      });
      if (url) {
        imageUrls.push(url);
      }
    } catch (e) {
      console.warn(`Keyframe generation failed for clip ${clip.clipNumber}:`, e);
      // If a clip fails, we still continue with others
    }
  }

  return imageUrls;
}

/**
 * Create an MP4 video from keyframe images using ffmpeg
 * Applies Ken Burns zoom/pan effects and crossfade transitions
 */
export async function createVideoFromKeyframes(
  imageUrls: string[],
  clipDurations: number[],
  options: {
    width?: number;
    height?: number;
    fps?: number;
    transitionDuration?: number;
  } = {}
): Promise<Buffer> {
  ensureWorkDir();

  const {
    width = 1920,
    height = 1080,
    fps = 30,
    transitionDuration = 1,
  } = options;

  const tempFiles: string[] = [];
  const timestamp = Date.now();

  try {
    // Download all images to local files
    const localImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imgPath = join(WORK_DIR, `frame_${timestamp}_${i}.png`);
      await downloadImage(imageUrls[i], imgPath);
      localImages.push(imgPath);
      tempFiles.push(imgPath);
    }

    if (localImages.length === 0) {
      throw new Error("No images available to create video");
    }

    // If only one image, create a simple zoom video
    if (localImages.length === 1) {
      const outputPath = join(WORK_DIR, `video_${timestamp}.mp4`);
      tempFiles.push(outputPath);
      const dur = clipDurations[0] || 8;

      execSync(
        `ffmpeg -y -loop 1 -i "${localImages[0]}" ` +
        `-vf "scale=${width * 2}:${height * 2},zoompan=z='min(zoom+0.001,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dur * fps}:s=${width}x${height}:fps=${fps}" ` +
        `-t ${dur} -c:v libx264 -pix_fmt yuv420p -preset fast "${outputPath}"`,
        { timeout: 120000 }
      );

      return readFileSync(outputPath);
    }

    // Multiple images: create individual clips with Ken Burns effects then concatenate
    const clipPaths: string[] = [];

    for (let i = 0; i < localImages.length; i++) {
      const clipPath = join(WORK_DIR, `clip_${timestamp}_${i}.mp4`);
      tempFiles.push(clipPath);
      clipPaths.push(clipPath);

      const dur = clipDurations[i] || 6;

      // Alternate between zoom-in and zoom-out for variety
      const isZoomIn = i % 2 === 0;
      const zoomFilter = isZoomIn
        ? `zoompan=z='min(zoom+0.0008,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dur * fps}:s=${width}x${height}:fps=${fps}`
        : `zoompan=z='if(eq(on,1),1.25,max(zoom-0.0008,1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dur * fps}:s=${width}x${height}:fps=${fps}`;

      execSync(
        `ffmpeg -y -loop 1 -i "${localImages[i]}" ` +
        `-vf "scale=${width * 2}:${height * 2},${zoomFilter}" ` +
        `-t ${dur} -c:v libx264 -pix_fmt yuv420p -preset fast "${clipPath}"`,
        { timeout: 120000 }
      );
    }

    // Create concat file
    const concatPath = join(WORK_DIR, `concat_${timestamp}.txt`);
    tempFiles.push(concatPath);
    const concatContent = clipPaths.map(p => `file '${p}'`).join("\n");
    writeFileSync(concatPath, concatContent);

    // Concatenate all clips with crossfade transitions
    const outputPath = join(WORK_DIR, `video_${timestamp}.mp4`);
    tempFiles.push(outputPath);

    if (clipPaths.length === 2) {
      // Simple crossfade for 2 clips
      const dur0 = clipDurations[0] || 6;
      execSync(
        `ffmpeg -y -i "${clipPaths[0]}" -i "${clipPaths[1]}" ` +
        `-filter_complex "[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=${dur0 - transitionDuration}[v]" ` +
        `-map "[v]" -c:v libx264 -pix_fmt yuv420p -preset fast "${outputPath}"`,
        { timeout: 120000 }
      );
    } else if (clipPaths.length > 2) {
      // Chain crossfades for 3+ clips
      let filterComplex = "";
      let currentOffset = 0;
      let lastOutput = "[0:v]";

      for (let i = 1; i < clipPaths.length; i++) {
        currentOffset += (clipDurations[i - 1] || 6) - transitionDuration;
        const outputLabel = i === clipPaths.length - 1 ? "[v]" : `[v${i}]`;
        filterComplex += `${lastOutput}[${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${currentOffset}${outputLabel}`;
        if (i < clipPaths.length - 1) filterComplex += ";";
        lastOutput = outputLabel;
      }

      const inputs = clipPaths.map(p => `-i "${p}"`).join(" ");
      execSync(
        `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" ` +
        `-map "[v]" -c:v libx264 -pix_fmt yuv420p -preset fast "${outputPath}"`,
        { timeout: 180000 }
      );
    } else {
      // Just one clip, copy it
      execSync(`cp "${clipPaths[0]}" "${outputPath}"`);
    }

    return readFileSync(outputPath);
  } finally {
    // Cleanup temp files
    cleanupFiles(tempFiles);
  }
}

/**
 * Overlay voiceover audio onto a video file using ffmpeg
 */
export async function overlayAudioOnVideo(
  videoPath: string,
  audioUrl: string,
  outputPath: string
): Promise<void> {
  ensureWorkDir();
  const audioPath = join(WORK_DIR, `audio_${Date.now()}.wav`);
  
  try {
    // Download the voiceover audio
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Failed to download audio: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(audioPath, buffer);

    // Combine video + audio with ffmpeg
    // -shortest ensures the output matches the shorter of video/audio
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" ` +
      `-c:v copy -c:a aac -b:a 128k -shortest ` +
      `"${outputPath}"`,
      { timeout: 120000 }
    );
  } finally {
    cleanupFiles([audioPath]);
  }
}

/**
 * Full video generation pipeline:
 * 1. Generate keyframe images for each clip
 * 2. Create MP4 video with Ken Burns effects
 * 3. Overlay voiceover audio if available
 * 4. Upload to S3
 */
export async function generateFullVideo(
  clipPlan: Array<{ clipNumber: number; duration: number; sceneDescription: string; cameraMovement: string }>,
  styleNotes: string,
  voiceoverUrl?: string | null,
  onProgress?: (step: string, detail: string) => void
): Promise<{ videoUrl: string; keyframeUrls: string[] }> {
  // Step 1: Generate keyframes
  onProgress?.("keyframes", "Generating AI keyframe images...");
  const keyframeUrls = await generateKeyframes(
    clipPlan,
    styleNotes,
    (num, total) => onProgress?.("keyframes", `Generating keyframe ${num}/${total}...`)
  );

  if (keyframeUrls.length === 0) {
    throw new Error("Failed to generate any keyframe images");
  }

  // Step 2: Create video from keyframes
  onProgress?.("video", "Creating MP4 video with Ken Burns effects...");
  const clipDurations = clipPlan.map(c => c.duration || 6);
  const usedDurations = clipDurations.slice(0, keyframeUrls.length);

  const videoBuffer = await createVideoFromKeyframes(keyframeUrls, usedDurations);

  // Step 3: Overlay voiceover audio if available
  let finalBuffer = videoBuffer;
  if (voiceoverUrl) {
    onProgress?.("audio", "Overlaying voiceover audio...");
    ensureWorkDir();
    const timestamp = Date.now();
    const silentVideoPath = join(WORK_DIR, `silent_${timestamp}.mp4`);
    const finalVideoPath = join(WORK_DIR, `final_${timestamp}.mp4`);
    
    try {
      writeFileSync(silentVideoPath, videoBuffer);
      await overlayAudioOnVideo(silentVideoPath, voiceoverUrl, finalVideoPath);
      finalBuffer = readFileSync(finalVideoPath);
    } catch (e: any) {
      console.warn("Audio overlay failed, using silent video:", e.message);
      // Fall back to silent video
    } finally {
      cleanupFiles([silentVideoPath, finalVideoPath]);
    }
  }

  // Step 4: Upload to S3
  onProgress?.("upload", "Uploading video to storage...");
  const { url: videoUrl } = await storagePut(
    `videos/generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`,
    finalBuffer,
    "video/mp4"
  );

  return { videoUrl, keyframeUrls };
}
