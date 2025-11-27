extends Node
# Audio Manager - Simple sound effects using pre-generated AudioStreamWAV
# Generates waveforms once and plays them back

var sound_enabled: bool = true
var music_enabled: bool = true

# Audio players for sounds
var laser_player: AudioStreamPlayer
var plasma_player: AudioStreamPlayer
var wave_player: AudioStreamPlayer
var explosion_player: AudioStreamPlayer
var hit_player: AudioStreamPlayer
var warp_player: AudioStreamPlayer
var powerup_player: AudioStreamPlayer
var big_explosion_player: AudioStreamPlayer

# Background music player
var bgm_player: AudioStreamPlayer

const SAMPLE_RATE = 22050

func _ready():
	# Create audio players with pre-generated waveforms
	laser_player = create_sound_player(generate_laser_wave(), "SFX")
	plasma_player = create_sound_player(generate_plasma_wave(), "SFX")
	wave_player = create_sound_player(generate_wave_wave(), "SFX")
	explosion_player = create_sound_player(generate_explosion_wave(), "SFX")
	hit_player = create_sound_player(generate_hit_wave(), "SFX")
	warp_player = create_sound_player(generate_warp_wave(), "SFX")
	powerup_player = create_sound_player(generate_powerup_wave(), "SFX")
	big_explosion_player = create_sound_player(generate_big_explosion_wave(), "SFX")
	
	# Create BGM player
	bgm_player = AudioStreamPlayer.new()
	bgm_player.bus = "Music"
	add_child(bgm_player)
	
	# Try to load background music (MP3 format)
	if FileAccess.file_exists("res://assets/audio/bgm.mp3"):
		var bgm_stream = load("res://assets/audio/bgm.mp3")
		if bgm_stream:
			bgm_player.stream = bgm_stream
			bgm_player.volume_db = -6.0
			print("Background music loaded: bgm.mp3")
		else:
			print("Failed to load bgm.mp3")
	else:
		print("Background music not found: res://assets/audio/bgm.mp3")
		print("Place bgm.mp3 in assets/audio/ folder for background music")
	
	# Wait a frame then start music
	await get_tree().process_frame
	start_music()
	print("Audio system initialized - Pre-generated sound effects ready")

func create_sound_player(stream: AudioStreamWAV, bus: String) -> AudioStreamPlayer:
	var player = AudioStreamPlayer.new()
	player.stream = stream
	player.bus = bus
	add_child(player)
	return player

# Generate laser sound - sweep from 1200Hz to 400Hz
func generate_laser_wave() -> AudioStreamWAV:
	var duration = 0.08
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	var phase = 0.0
	for i in range(samples):
		var t = float(i) / float(samples)
		var freq = lerp(1200.0, 400.0, t)
		var env = 1.0 - t
		var sample = sin(phase * TAU) * 0.3 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
		phase = fmod(phase + freq / SAMPLE_RATE, 1.0)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate plasma sound - dual tone
func generate_plasma_wave() -> AudioStreamWAV:
	var duration = 0.12
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	var phase1 = 0.0
	var phase2 = 0.0
	for i in range(samples):
		var t = float(i) / float(samples)
		var env = 1.0 - t * 0.5
		var sample = (sin(phase1 * TAU) * 0.3 + sin(phase2 * TAU) * 0.2) * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
		phase1 = fmod(phase1 + 800.0 / SAMPLE_RATE, 1.0)
		phase2 = fmod(phase2 + 1200.0 / SAMPLE_RATE, 1.0)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate wave sound - modulated tone
func generate_wave_wave() -> AudioStreamWAV:
	var duration = 0.15
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	var phase = 0.0
	var lfo_phase = 0.0
	for i in range(samples):
		var t = float(i) / float(samples)
		var env = 1.0 - t * 0.6
		var lfo = sin(lfo_phase * TAU) * 0.3
		var freq = 600.0 * (1.0 + lfo)
		var sample = sin(phase * TAU) * 0.25 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
		phase = fmod(phase + freq / SAMPLE_RATE, 1.0)
		lfo_phase = fmod(lfo_phase + 30.0 / SAMPLE_RATE, 1.0)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate explosion sound - noise burst
func generate_explosion_wave() -> AudioStreamWAV:
	var duration = 0.25
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	for i in range(samples):
		var t = float(i) / float(samples)
		var env = exp(-t * 8.0)
		var sample = (randf() * 2.0 - 1.0) * 0.4 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate big explosion sound - longer noise burst
func generate_big_explosion_wave() -> AudioStreamWAV:
	var duration = 0.5
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	for i in range(samples):
		var t = float(i) / float(samples)
		var env = exp(-t * 5.0)
		var sample = (randf() * 2.0 - 1.0) * 0.6 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate hit sound - downward sweep
func generate_hit_wave() -> AudioStreamWAV:
	var duration = 0.1
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	var phase = 0.0
	for i in range(samples):
		var t = float(i) / float(samples)
		var freq = lerp(400.0, 100.0, t)
		var env = 1.0 - t
		var sample = sin(phase * TAU) * 0.35 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
		phase = fmod(phase + freq / SAMPLE_RATE, 1.0)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate warp sound - long upward sweep
func generate_warp_wave() -> AudioStreamWAV:
	var duration = 2.6
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples * 2)
	
	var phase = 0.0
	for i in range(samples):
		var t = float(i) / float(samples)
		var freq = lerp(50.0, 1200.0, t)
		var env = 1.0 - t * 0.3
		var sample = sin(phase * TAU) * 0.4 * env
		var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data.encode_s16(i * 2, byte_val)
		phase = fmod(phase + freq / SAMPLE_RATE, 1.0)
	
	return create_wav_stream(data, SAMPLE_RATE)

# Generate powerup sound - ascending arpeggio
func generate_powerup_wave() -> AudioStreamWAV:
	var notes = [440.0, 554.0, 659.0, 880.0]  # A4, C#5, E5, A5
	var note_duration = 0.08
	var total_samples = int(SAMPLE_RATE * note_duration * notes.size())
	var data = PackedByteArray()
	data.resize(total_samples * 2)
	
	var sample_idx = 0
	for note_freq in notes:
		var samples_per_note = int(SAMPLE_RATE * note_duration)
		var phase = 0.0
		for i in range(samples_per_note):
			var t = float(i) / float(samples_per_note)
			var env = 1.0 - t * 0.5
			var sample = sin(phase * TAU) * 0.3 * env
			var byte_val = int(clamp(sample * 32767.0, -32768.0, 32767.0))
			data.encode_s16(sample_idx * 2, byte_val)
			phase = fmod(phase + note_freq / SAMPLE_RATE, 1.0)
			sample_idx += 1
	
	return create_wav_stream(data, SAMPLE_RATE)

# Helper to create AudioStreamWAV from PCM data
func create_wav_stream(data: PackedByteArray, sample_rate: int) -> AudioStreamWAV:
	var stream = AudioStreamWAV.new()
	stream.data = data
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	return stream

func toggle_sound():
	sound_enabled = not sound_enabled
	if sound_enabled:
		AudioServer.set_bus_mute(AudioServer.get_bus_index("Master"), false)
		if music_enabled and bgm_player and bgm_player.stream:
			bgm_player.play()
	else:
		AudioServer.set_bus_mute(AudioServer.get_bus_index("Master"), true)
		if bgm_player:
			bgm_player.stop()
	print("Sound ", "enabled" if sound_enabled else "disabled")

func set_master_volume(volume_db: float):
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Master"), volume_db)

func start_music():
	if bgm_player and music_enabled and sound_enabled and bgm_player.stream and not bgm_player.playing:
		bgm_player.play()
	
func stop_music():
	if bgm_player and bgm_player.playing:
		bgm_player.stop()

# Sound effect functions
func play_laser_sound():
	if not sound_enabled or not laser_player:
		return
	laser_player.play()

func play_plasma_sound():
	if not sound_enabled or not plasma_player:
		return
	plasma_player.play()

func play_wave_sound():
	if not sound_enabled or not wave_player:
		return
	wave_player.play()

func play_explosion_sound():
	if not sound_enabled or not explosion_player:
		return
	explosion_player.play()

func play_big_explosion_sound():
	if not sound_enabled or not big_explosion_player:
		return
	big_explosion_player.play()

func play_hit_sound():
	if not sound_enabled or not hit_player:
		return
	hit_player.play()

func play_warp_sound():
	if not sound_enabled or not warp_player:
		return
	warp_player.play()

func play_powerup_sound():
	if not sound_enabled or not powerup_player:
		return
	powerup_player.play()

func play_missile_sound():
	if not sound_enabled:
		return
	play_laser_sound()

# Convenience aliases matching entity code
func play_laser():
	play_laser_sound()

func play_plasma():
	play_plasma_sound()

func play_wave():
	play_wave_sound()

func play_explosion():
	play_explosion_sound()

func play_hit():
	play_hit_sound()

func play_warp():
	play_warp_sound()

func play_powerup():
	play_powerup_sound()

func play_missile():
	play_missile_sound()

func play_boss_death():
	play_big_explosion_sound()

func play_boss_charge():
	play_explosion_sound()

func play_boss_beam():
	play_laser_sound()

func play_enemy_fire():
	play_hit_sound()

func play_victory():
	play_powerup_sound()

