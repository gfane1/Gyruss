extends BossBase
# Galactic Core Boss - 6 orbitals with beam weapons
# Orbitals rotate around core, fire energy beams
# Most challenging boss

class_name GalacticCore

var orbitals: Array = []
var orbital_count: int = 6
var orbital_distance: float = 120.0
var orbital_radius: float = 18.0
var orbital_rotation_speed: float = 45.0  # deg/sec

var core_radius: float = 50.0

var beam_timer: float = 0.0
var beam_cooldown: float = 4.0
var active_beams: Array = []

func _init():
	boss_type = "galactic_core"
	hp = 300
	max_hp = 300
	death_duration = 6.0
	fire_rate = 0.8
	move_speed = 60.0
	
	x = Constants.SCREEN_WIDTH / 2.0
	y = Constants.SCREEN_HEIGHT / 2.0
	
	# Initialize orbitals
	for i in range(orbital_count):
		orbitals.append({
			"angle": (float(i) / float(orbital_count)) * TAU,
			"hp": 30,
			"max_hp": 30,
			"destroyed": false,
			"fire_timer": randf() * 3.0
		})

func update_movement(delta: float):
	if is_destroying:
		return
	
	var aggression = get_aggression_multiplier()
	
	# Figure-8 movement
	var pattern_speed = 0.6 * aggression
	x = Constants.SCREEN_WIDTH / 2.0 + sin(age * pattern_speed) * 120.0
	y = Constants.SCREEN_HEIGHT / 2.0 + sin(age * pattern_speed * 2.0) * 80.0
	
	# Rotate orbitals
	for orbital in orbitals:
		orbital.angle += deg_to_rad(orbital_rotation_speed * aggression) * delta
		orbital.angle = Constants.wrap_angle(orbital.angle)
		
		# Spawn particle trail for active orbitals (throttled)
		if not orbital.destroyed and randf() < 0.3:
			var orbital_pos = get_orbital_position(orbital)
			GameManager.create_particle(orbital_pos, "normal", Color(0.2, 0.8, 1.0, 0.6))
	
	# Update beam attack
	beam_timer += delta
	if beam_timer >= beam_cooldown:
		fire_beam_attack()
		beam_timer = 0.0
	
	# Update active beams
	update_beams(delta)

func fire():
	if is_destroying:
		return
	
	# Orbitals fire spread shots
	for orbital in orbitals:
		if orbital.destroyed:
			continue
		
		orbital.fire_timer += last_delta
		if orbital.fire_timer >= fire_rate:
			fire_orbital(orbital)
			orbital.fire_timer = 0.0

func fire_orbital(orbital: Dictionary):
	var orbital_pos = get_orbital_position(orbital)
	
	# Fire 3-way spread
	for i in range(-1, 2):
		var angle = orbital.angle + deg_to_rad(i * 20)
		
		var bullet = {
			"x": orbital_pos.x,
			"y": orbital_pos.y,
			"vx": cos(angle) * 220.0,
			"vy": sin(angle) * 220.0,
			"speed": 220.0,
			"damage": 1,
			"type": "boss"
		}
		GameManager.boss_bullets.append(bullet)

func fire_beam_attack():
	if is_destroying:
		return
	
	# Find active orbitals
	var active_orbitals = []
	for orbital in orbitals:
		if not orbital.destroyed:
			active_orbitals.append(orbital)
	
	if active_orbitals.is_empty():
		return
	
	# Pick 2 random orbitals
	var count = mini(2, active_orbitals.size())
	for i in range(count):
		var orbital = active_orbitals[randi() % active_orbitals.size()]
		create_beam(orbital)
	
	AudioManager.play_boss_beam()

func create_beam(orbital: Dictionary):
	var orbital_pos = get_orbital_position(orbital)
	
	# Beam toward player
	var target_pos = Constants.SCREEN_CENTER
	if GameManager.player != null:
		var player = GameManager.player
		target_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	
	var beam = {
		"start": orbital_pos,
		"end": target_pos,
		"width": 8.0,
		"damage": 2,
		"duration": 1.5,
		"age": 0.0,
		"color": Color(0.0, 1.0, 1.0, 0.8)
	}
	active_beams.append(beam)

func update_beams(delta: float):
	var i = active_beams.size() - 1
	while i >= 0:
		var beam = active_beams[i]
		beam.age += delta
		
		if beam.age >= beam.duration:
			active_beams.remove_at(i)
		else:
			# Check beam collision with player
			check_beam_collision(beam)
		
		i -= 1

func check_beam_collision(beam: Dictionary):
	if GameManager.player == null:
		return
	
	var player = GameManager.player
	var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	
	# Point-to-line distance
	var line_vec = beam.end - beam.start
	var point_vec = player_pos - beam.start
	var line_len = line_vec.length()
	
	if line_len < 1.0:
		return
	
	var line_unit = line_vec / line_len
	var proj = point_vec.dot(line_unit)
	
	if proj < 0 or proj > line_len:
		return
	
	var closest = beam.start + line_unit * proj
	var dist = player_pos.distance_to(closest)
	
	if dist <= beam.width + Constants.PLAYER_SIZE:
		player.take_damage()

func get_orbital_position(orbital: Dictionary) -> Vector2:
	var offset_x = cos(orbital.angle) * orbital_distance
	var offset_y = sin(orbital.angle) * orbital_distance
	return Vector2(x + offset_x, y + offset_y)

func take_orbital_damage(orbital_index: int, damage: int) -> bool:
	if orbital_index < 0 or orbital_index >= orbitals.size():
		return false
	
	var orbital = orbitals[orbital_index]
	if orbital.destroyed:
		return false
	
	orbital.hp -= damage
	
	if orbital.hp <= 0:
		orbital.destroyed = true
		var pos = get_orbital_position(orbital)
		GameManager.spawn_explosion(pos, 70, Color.CYAN)
		GameManager.add_score(400)
		
		# Damage boss HP
		return take_damage(20)
	else:
		var pos = get_orbital_position(orbital)
		GameManager.spawn_explosion(pos, 30, Color(0.5, 0.8, 1.0))
	
	return false

func get_collision_shapes() -> Array:
	var shapes = []
	
	# Core collision
	shapes.append({
		"position": Vector2(x, y),
		"radius": core_radius,
		"is_core": true
	})
	
	# Orbital collisions
	for i in range(orbitals.size()):
		var orbital = orbitals[i]
		if not orbital.destroyed:
			shapes.append({
				"position": get_orbital_position(orbital),
				"radius": orbital_radius,
				"orbital_index": i
			})
	
	return shapes

func update_destruction(delta: float):
	super.update_destruction(delta)
	
	# Multi-phase destruction with pulsing effect
	var progress = (death_duration - death_timer) / death_duration
	
	# Phase 1 (0-0.25): Orbital explosions
	if progress < 0.25:
		if randf() < 7.0 * delta:
			for orbital in orbitals:
				if not orbital.destroyed and randf() < 0.4:
					var pos = get_orbital_position(orbital)
					GameManager.spawn_explosion(pos, 55, Color.CYAN)
	
	# Phase 2 (0.25-0.5): Core destabilization
	elif progress < 0.5:
		# Pulse effect intensifies
		if int(death_timer * 15.0) % 2 == 0:
			var offset = Vector2(randf_range(-30, 30), randf_range(-30, 30))
			GameManager.spawn_explosion(Vector2(x, y) + offset, 60, Color(0.5, 1.0, 1.0))
	
	# Phase 3 (0.5-0.75): Energy discharge
	elif progress < 0.75:
		if randf() < 10.0 * delta:
			# Radial explosions
			var angle = randf() * TAU
			var dist = randf_range(20, 70)
			var offset = Vector2(cos(angle) * dist, sin(angle) * dist)
			GameManager.spawn_explosion(Vector2(x, y) + offset, 50, Color(0.8, 0.9, 1.0))
	
	# Phase 4 (0.75-1.0): Catastrophic collapse
	else:
		if randf() < 18.0 * delta:
			var offset = Vector2(randf_range(-100, 100), randf_range(-100, 100))
			GameManager.spawn_explosion(Vector2(x, y) + offset, 100, Color.WHITE)
		
		# Final pulse
		if int(death_timer * 20.0) % 3 == 0:
			GameManager.spawn_explosion(Vector2(x, y), 120, Color.CYAN)
