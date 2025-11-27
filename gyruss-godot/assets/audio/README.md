# Audio Assets

This folder is for optional audio files for the Gyruss game.

## Sound System

**All sound effects are generated procedurally** - you don't need any audio files for sounds to work! The game generates laser, plasma, wave, explosion, and other sounds in real-time using code. Background music (bgm.mp3) is included.

## Optional: Background Music

Background music file **bgm.mp3** is included and will play automatically:

- **bgm.mp3** - Main background music loop
  - Format: MP3
  - Loop: Seamless
  - Style: Arcade/space theme
  
The game automatically detects and plays it on startup.

## Converting MP3 to OGG

If you have the `bgm.mp3` from the HTML version (in `gyruss-html-js` folder), you can convert it to OGG:

### Option 1: Using Audacity (Free)
1. Download Audacity from https://www.audacityteam.org/
2. Open bgm.mp3 in Audacity
3. File → Export → Export as OGG
4. Save as `bgm.ogg` in this folder

### Option 2: Using FFmpeg (Command line)
```bash
ffmpeg -i bgm.mp3 -c:a libvorbis -q:a 4 bgm.ogg
```

### Option 3: Online Converter
- Visit https://cloudconvert.com/mp3-to-ogg
- Upload bgm.mp3 and convert
- Download and rename to bgm.ogg

## Current Status

✅ **Sound Effects** - Fully working (procedurally generated, no files needed)
✅ **Background Music** - Included (bgm.mp3)
