extends Node

# Game Manager - Core game state and entity management
# Based on working src/game.js implementation

enum GameState { ATTRACT, PLAYING, WARP, BONUS, BOSS, VICTORY, GAME_OVER }

# Game state
var state: GameState = GameState.ATTRACT
var score: int = 0
var wave_number: int = 0
var world_time: float = 0.0
var first_input_armed: bool = false
var game_over_timer: float = 0.0

# Planet progression (CRITICAL: 3 warps per planet!)
var planet_index: int = 0
var warps_to_planet: int = 3  # Decrements each warp
var satellite_waves_completed: int = 0
var satellites_destroyed: int = 0
var satellites_in_current_wave: int = 0
var satellite_wave_active: bool = false

# Warp system
var warp_timer: float = 0.0
const WARP_DURATION = 2.8  # Full 2.8 seconds (not 2.0!)

# Boss system
var boss_index: int = 0
var boss_type: int = -1
var boss_instance = null

# Extra life system
var last_extra_life_threshold: int = 0
const EXTRA_LIFE_INTERVAL: int = 30000

# Screen shake system
var shake_timer: float = 0.0
var shake_magnitude: float = 0.0

# Entity references
var player = null  # PlayerEntity instance

# Entity arrays
var enemies: Array[Dictionary] = []
var bullets: Array[Dictionary] = []
var enemy_bullets: Array[Dictionary] = []
var boss_bullets: Array[Dictionary] = []
var satellites: Array[Dictionary] = []
var missiles: Array[Dictionary] = []
var particles: Array[Dictionary] = []

# Starfield (managed separately by renderer but referenced here)
var stars: Array[Dictionary] = []

# Wave spawning
var spawn_timer: float = 0.0
var is_satellite_wave: bool = false
var waves_completed: int = 0

signal state_changed(new_state: GameState)
signal score_changed(new_score: int)
signal lives_changed(new_lives: int)
signal planet_changed(planet_name: String)

func _ready():
	start_attract_mode()

func _process(delta: float):
	world_time += delta
	handle_global_shortcuts()
	
	# Update screen shake
	if shake_timer > 0:
		shake_timer -= delta
		if shake_timer <= 0:
			shake_magnitude = 0.0
	
	match state:
		GameState.ATTRACT:
			update_attract(delta)
		GameState.PLAYING:
			update_playing(delta)
		GameState.WARP:
			update_warp(delta)
		GameState.BONUS:
			update_bonus(delta)
		GameState.BOSS:
			update_boss(delta)
		GameState.VICTORY:
			update_victory(delta)
		GameState.GAME_OVER:
			update_game_over(delta)
	
	if state in [GameState.PLAYING, GameState.WARP, GameState.BONUS, GameState.BOSS]:
		update_entities(delta)

func handle_global_shortcuts():
	var had_input = (
		InputHandler.restart_pressed or
		InputHandler.debug_invulnerable_pressed or
		InputHandler.debug_warp_pressed or
		InputHandler.debug_boss_pressed
	)

	if InputHandler.restart_pressed:
		start_game()

	if InputHandler.debug_invulnerable_pressed and player != null:
		player.invulnerable = not player.invulnerable
		InputHandler.debug_mode = player.invulnerable

	if InputHandler.debug_warp_pressed and state != GameState.WARP:
		start_warp()

	if InputHandler.debug_boss_pressed:
		jump_to_boss()

	if had_input:
		InputHandler.clear_debug_keys()

func start_attract_mode():
	state = GameState.ATTRACT
	first_input_armed = false
	init_starfield(200)  # Smaller starfield for attract mode
	state_changed.emit(state)

func start_game():
	reset_game()
	state = GameState.PLAYING
	create_player()
	init_starfield(350)  # Full starfield for gameplay
	spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)
	state_changed.emit(state)

func jump_to_boss():
	enemies.clear()
	bullets.clear()
	enemy_bullets.clear()
	boss_bullets.clear()
	satellites.clear()
	missiles.clear()
	satellite_wave_active = false
	satellite_waves_completed = 0
	satellites_in_current_wave = 0
	satellites_destroyed = 0
	warps_to_planet = 0
	if player == null:
		create_player()
	init_starfield(350)
	state = GameState.BOSS
	planet_index = 6
	planet_changed.emit(Constants.PLANETS[planet_index])
	create_boss(boss_index)
	boss_index = (boss_index + 1) % 3
	state_changed.emit(state)

func reset_game():
	score = 0
	wave_number = 0
	world_time = 0.0
	planet_index = 0
	warps_to_planet = 3  # Reset warp counter
	satellite_waves_completed = 0
	satellites_destroyed = 0
	waves_completed = 0
	boss_index = 0
	satellite_wave_active = false
	
	# Clear all entities
	enemies.clear()
	bullets.clear()
	enemy_bullets.clear()
	boss_bullets.clear()
	satellites.clear()
	missiles.clear()
	particles.clear()
	boss_instance = null
	boss_type = -1
	
	score_changed.emit(score)
	planet_changed.emit(Constants.PLANETS[planet_index])

func create_player():
	player = PlayerEntity.new()
	lives_changed.emit(player.lives)

func init_starfield(count: int):
	stars.clear()
	var adjusted_count = int(count * Constants.get_starfield_multiplier())
	
	# Tier distribution matching JS
	var tier1_count = int(adjusted_count * 0.6)   # 60% tiny
	var tier2_count = int(adjusted_count * 0.25)  # 25% normal
	var tier3_count = int(adjusted_count * 0.11)  # 11% bright
	var tier4_count = adjusted_count - tier1_count - tier2_count - tier3_count  # 4% brilliant
	
	# Create tier 1 stars (tiny)
	for i in range(tier1_count):
		stars.append(create_star(0, 0.8, 1.5, 5.0, 15.0, Color(0.6, 0.6, 0.7, 0.5)))
	
	# Create tier 2 stars (normal)
	for i in range(tier2_count):
		stars.append(create_star(1, 1.2, 2.2, 15.0, 30.0, Color(0.8, 0.8, 0.9, 0.7)))
	
	# Create tier 3 stars (bright)
	for i in range(tier3_count):
		stars.append(create_star(2, 1.8, 2.8, 30.0, 50.0, Color(0.9, 0.9, 1.0, 0.85)))
	
	# Create tier 4 stars (brilliant)
	for i in range(tier4_count):
		stars.append(create_star(3, 2.5, 4.0, 50.0, 80.0, Color(1.0, 1.0, 1.0, 1.0)))

func create_star(tier: int, size_min: float, size_max: float, speed_min: float, speed_max: float, col: Color) -> Dictionary:
	return {
		"angle": randf() * TAU,
		"radius": Constants.rand_range(Constants.STARFIELD_SPAWN_RADIUS_MIN, Constants.STARFIELD_SPAWN_RADIUS_MAX),
		"speed": Constants.rand_range(speed_min, speed_max),
		"parallax": Constants.rand_range(0.35, 1.0),
		"size": Constants.rand_range(size_min, size_max),
		"color": col,
		"tier": tier,
		"twinkle_phase": randf() * TAU,
		"twinkle_speed": Constants.rand_range(1.0, 4.0)
	}

func update_attract(_delta: float):
	# Wait for input to start game
	if InputHandler.fire_pressed and not first_input_armed:
		first_input_armed = true
	
	if InputHandler.fire_pressed and first_input_armed:
		start_game()

func update_playing(delta: float):
	# Spawn waves
	spawn_timer -= delta
	if spawn_timer <= 0 and enemies.size() == 0 and satellites.size() == 0:
		if is_satellite_wave:
			spawn_satellite_wave()
		else:
			spawn_next_wave()
		
		wave_number += 1
		waves_completed += 1
		is_satellite_wave = (waves_completed % Constants.WAVES_PER_WARP == 0)
		spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)

func update_warp(delta: float):
	warp_timer += delta
	if warp_timer >= WARP_DURATION:
		complete_warp()

func update_bonus(_delta: float):
	# Bonus stage - check for completion
	if enemies.size() == 0:
		state = GameState.PLAYING
		spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)
		state_changed.emit(state)

func update_boss(delta: float):
	if boss_instance == null:
		return

	boss_instance.update(delta)

func update_victory(_delta: float):
	# Victory state - wait for input
	pass

func update_game_over(delta: float):
	game_over_timer += delta
	# Wait for restart input
	pass

func update_entities(delta: float):
	if player != null:
		player.update(delta)

	update_enemy_list(delta)
	BulletEntity.update_player_bullets(delta)
	BulletEntity.update_enemy_bullets(delta)
	update_boss_bullets(delta)
	update_missiles(delta)
	update_satellites(delta)
	enforce_particle_budget()

func update_enemy_list(delta: float):
	var i = enemies.size() - 1
	while i >= 0:
		var enemy = enemies[i]
		EnemyEntity.update(enemy, delta)
		
		var remove_enemy = false
		if enemy.radius > Constants.PLAYER_ORBIT_RADIUS + 60.0:
			# Enemy breached center ring
			if player != null:
				player.take_damage()
			remove_enemy = true
		elif enemy.radius < -250.0:
			# Never entered playfield
			remove_enemy = true
		
		if remove_enemy:
			enemies.remove_at(i)
		
		i -= 1

func update_boss_bullets(delta: float):
	var i = boss_bullets.size() - 1
	while i >= 0:
		var bullet = boss_bullets[i]
		bullet.x += bullet.get("vx", 0.0) * delta
		bullet.y += bullet.get("vy", 0.0) * delta
		
		if player != null and boss_bullet_hits_player(bullet):
			boss_bullets.remove_at(i)
		elif is_offscreen_cartesian(bullet.get("x", 0.0), bullet.get("y", 0.0)):
			boss_bullets.remove_at(i)
		
		i -= 1

func update_missiles(delta: float):
	var i = missiles.size() - 1
	while i >= 0:
		var missile = missiles[i]
		if MissileEntity.update(missile, delta):
			missiles.remove_at(i)
		
		i -= 1

func update_satellites(delta: float):
	var i = satellites.size() - 1
	while i >= 0:
		var sat = satellites[i]
		if SatelliteEntity.update(sat, delta):
			satellites.remove_at(i)
			satellites_destroyed += 1
			add_score(Constants.SATELLITE_SCORE)
		
		i -= 1

	if satellite_wave_active and satellites_in_current_wave > 0 and satellites.size() == 0 and satellites_destroyed >= satellites_in_current_wave:
		complete_satellite_wave()

func complete_satellite_wave():
	satellite_wave_active = false
	satellite_waves_completed += 1
	satellites_in_current_wave = 0
	satellites_destroyed = 0
	
	if satellite_waves_completed >= Constants.SATELLITE_WAVES_PER_WARP:
		start_warp()
	else:
		spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)

func apply_boss_damage(shape: Dictionary, damage: int) -> bool:
	if boss_instance == null:
		return false

	if shape.has("segment_index") and boss_instance.has_method("take_segment_damage"):
		return boss_instance.take_segment_damage(shape.get("segment_index"), damage)
	if shape.has("turret_index") and boss_instance.has_method("take_turret_damage"):
		return boss_instance.take_turret_damage(shape.get("turret_index"), damage)
	if shape.has("orbital_index") and boss_instance.has_method("take_orbital_damage"):
		return boss_instance.take_orbital_damage(shape.get("orbital_index"), damage)

	return boss_instance.take_damage(damage)

func boss_bullet_hits_player(bullet: Dictionary) -> bool:
	if player == null:
		return false

	var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	var bullet_pos = Vector2(bullet.get("x", 0.0), bullet.get("y", 0.0))
	var hit_radius = Constants.PLAYER_SIZE + bullet.get("hit_radius", 6.0)
	var hit_radius_sq = hit_radius * hit_radius
	
	if Constants.dist_sq_vec(player_pos, bullet_pos) <= hit_radius_sq:
		player.take_damage()
		return true

	return false

func is_offscreen_cartesian(x: float, y: float) -> bool:
	var margin = 60.0
	return (
		x < -margin or x > Constants.SCREEN_WIDTH + margin or
		y < -margin or y > Constants.SCREEN_HEIGHT + margin
	)

func enforce_particle_budget():
	while particles.size() > Constants.MAX_PARTICLES:
		particles.remove_at(0)

func start_warp():
	if state == GameState.WARP:
		return
	state = GameState.WARP
	warp_timer = 0.0
	satellite_wave_active = false
	satellites_in_current_wave = 0
	satellites_destroyed = 0
	# DON'T reset player weapons here - preserve through warp!
	state_changed.emit(state)
	AudioManager.play_warp_sound()

func complete_warp():
	warps_to_planet -= 1  # CRITICAL: Decrement warp counter
	
	if warps_to_planet <= 0:
		# Advance to next planet
		planet_index += 1
		warps_to_planet = 3  # Reset counter
		
		if planet_index == 6:  # "THE CORE" (index 6)
			state = GameState.BOSS
			create_boss(boss_index)
			boss_index = (boss_index + 1) % 3
		elif planet_index < 6:
			state = GameState.BONUS
			spawn_bonus_wave()
		else:
			# Victory! Beat all planets
			state = GameState.VICTORY
		
		planet_changed.emit(Constants.PLANETS[planet_index])
	else:
		# Continue on same planet
		state = GameState.PLAYING
		spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)
	
	# Reset satellite wave counter
	satellite_waves_completed = 0
	satellite_wave_active = false
	state_changed.emit(state)

func trigger_victory():
	state = GameState.VICTORY
	state_changed.emit(state)

func trigger_game_over():
	state = GameState.GAME_OVER
	game_over_timer = 0.0
	state_changed.emit(state)

func add_score(points: int):
	var old_score = score
	score += points
	score_changed.emit(score)
	
	# Extra life system - award life every 30,000 points
	var old_threshold = int(old_score / EXTRA_LIFE_INTERVAL)
	var new_threshold = int(score / EXTRA_LIFE_INTERVAL)
	
	if new_threshold > old_threshold and player != null:
		player.lives += 1
		lives_changed.emit(player.lives)
		AudioManager.play_powerup_sound()
		print("Extra life awarded! Total lives: ", player.lives)

func boss_defeated():
	# Trigger screen shake for dramatic effect
	trigger_screen_shake(1.0, 12.0)
	
	state = GameState.VICTORY
	boss_instance = null
	add_score(5000)

func trigger_screen_shake(duration: float, magnitude: float):
	"""Trigger camera shake effect for duration seconds with given magnitude (pixels)"""
	shake_timer = duration
	shake_magnitude = magnitude

# Wave spawning functions (matches JS exactly)
func spawn_next_wave():
	var wave_type = randf()
	if wave_type < 0.4:
		spawn_spiral_wave()
	elif wave_type < 0.8:
		spawn_v_shape_wave()
	else:
		spawn_arc_wave()

func spawn_spiral_wave():
	var count = mini(24, 8 + wave_number)
	
	for i in range(count):
		var angle = (float(i) / count) * TAU * 2.0
		var radius = -20.0 - (i * 5.0)
		var enemy_type = "saucer" if randf() > 0.7 else "fighter"
		var enemy = EnemyEntity.create(enemy_type, angle, radius, 150.0)
		enemy.base_angle = angle
		enemy.oscillation_amplitude = deg_to_rad(Constants.rand_range(10.0, 30.0))
		enemy.oscillation_frequency = Constants.rand_range(1.0, 2.5)
		if enemy_type == "fighter" and randf() > 0.7:
			enemy.hp = 2
			enemy.max_hp = 2
		enemies.append(enemy)

func spawn_v_shape_wave():
	var count = mini(10, 4 + int(wave_number / 2.0))
	var start_angle = randf() * TAU
	
	for i in range(count):
		var mirror = 1 if randf() > 0.5 else -1
		var angle = start_angle + (i * 0.2 * mirror)
		var enemy = EnemyEntity.create("fighter", angle, -20.0, 150.0)
		enemy.base_angle = angle
		enemy.oscillation_amplitude = deg_to_rad(20.0)
		enemy.oscillation_frequency = 2.0
		enemy.phase = randf() * TAU
		enemies.append(enemy)

func spawn_arc_wave():
	var count = mini(16, 6 + int(wave_number / 3.0))
	var start_angle = randf() * TAU
	var arc_length = PI / 2.0
	
	for i in range(count):
		var angle = start_angle + (float(i) / count) * arc_length
		var enemy = EnemyEntity.create("fighter", angle, -20.0, 150.0)
		enemy.base_angle = angle
		enemy.oscillation_amplitude = deg_to_rad(15.0)
		enemy.oscillation_frequency = 1.5
		enemy.phase = randf() * TAU
		enemies.append(enemy)

func spawn_satellite_wave():
	satellite_wave_active = true
	var center_angle = randf() * TAU
	
	satellites.append(create_satellite(center_angle - 0.2, false))
	satellites.append(create_satellite(center_angle, true))  # Center has powerup
	satellites.append(create_satellite(center_angle + 0.2, false))
	
	satellites_in_current_wave = 3
	satellites_destroyed = 0
	
	# Reset to Laser ONLY at very start of satellite cycle
	if satellite_waves_completed == 0 and player != null:
		player.current_weapon = Constants.WEAPONS.Laser


func create_satellite(angle: float, has_powerup: bool) -> Dictionary:
	var powerup_type = ""
	if has_powerup:
		powerup_type = get_satellite_powerup_type()
	var satellite = SatelliteEntity.create(angle, powerup_type)
	satellite.radius = -20.0
	satellite.enter_speed = 100.0
	satellite.has_powerup = has_powerup
	satellite.lifetime = Constants.SATELLITE_LIFETIME
	satellite.age = 0.0
	return satellite

func get_satellite_powerup_type() -> String:
	var options = ["Plasma", "Wave", "Missile"]
	return options[randi() % options.size()]

func spawn_bonus_wave():
	for i in range(12):
		var angle = (float(i) / 12.0) * TAU
		var enemy = EnemyEntity.create("fighter", angle, -20.0, 150.0)
		enemy.base_angle = angle
		enemy.oscillation_amplitude = deg_to_rad(25.0)
		enemy.oscillation_frequency = 1.8
		enemy.fire_rate = 9999.0  # Effectively prevent firing during bonus stage
		enemy.harmless = true
		enemies.append(enemy)

func create_boss(index: int):
	boss_bullets.clear()
	boss_type = index % 3
	match boss_type:
		0:
			boss_instance = CosmicSerpent.new()
		1:
			boss_instance = StarDestroyer.new()
		2:
			boss_instance = GalacticCore.new()
		_:
			boss_instance = CosmicSerpent.new()

func spawn_explosion(pos: Vector2, count: int, color: Color = Color.WHITE):
	var particle_count = int(count * Constants.get_particle_multiplier())
	
	# Main explosion particles (60%)
	for i in range(int(particle_count * 0.6)):
		particles.append(create_particle(pos, "normal", color))
	
	# Sparks (30%)
	for i in range(int(particle_count * 0.3)):
		particles.append(create_particle(pos, "spark", Color.WHITE))
	
	# Smoke (10%)
	for i in range(int(particle_count * 0.1)):
		particles.append(create_particle(pos, "smoke", Color(0.4, 0.4, 0.4)))

	enforce_particle_budget()

func create_particle(pos: Vector2, type: String, col: Color) -> Dictionary:
	var vx = Constants.rand_range(-150.0, 150.0)
	var vy = Constants.rand_range(-150.0, 150.0)
	var lifetime = Constants.rand_range(Constants.PARTICLE_LIFETIME_MIN, Constants.PARTICLE_LIFETIME_MAX)
	
	if type == "spark":
		vx *= 2.0
		vy *= 2.0
		lifetime *= 0.5
	elif type == "smoke":
		vx *= 0.3
		vy *= 0.3
		lifetime *= 2.0
	
	return {
		"position": pos,
		"vx": vx,
		"vy": vy,
		"life": lifetime,
		"age": 0.0,
		"rotation": randf() * TAU,
		"rot_speed": Constants.rand_range(-5.0, 5.0),
		"type": type,
		"color": col,
		"size": Constants.rand_range(2.0, 6.0)
	}
