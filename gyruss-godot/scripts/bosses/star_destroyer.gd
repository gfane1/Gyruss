extends BossBase
# Star Destroyer Boss - 8 turrets with charge attacks
# Rotates slowly, turrets fire independently
# Charge attack creates bullet spread

class_name StarDestroyer

var turrets: Array = []
var turret_count: int = 8
var turret_distance: float = 80.0
var turret_radius: float = 15.0

var rotation_angle: float = 0.0
var rotation_speed: float = 30.0  # deg/sec

var charge_timer: float = 0.0
var charge_duration: float = 5.0
var is_charging: bool = false

func _init():
	boss_type = "star_destroyer"
	hp = 250
	max_hp = 250
	death_duration = 6.0
	fire_rate = 1.2
	move_speed = 80.0
	
	x = Constants.SCREEN_WIDTH / 2.0
	y = Constants.SCREEN_HEIGHT / 2.0
	
	# Initialize turrets
	for i in range(turret_count):
		turrets.append({
			"angle": (float(i) / float(turret_count)) * TAU,
			"hp": 25,
			"max_hp": 25,
			"destroyed": false,
			"fire_timer": randf() * 2.0
		})

func update_movement(delta: float):
	if is_destroying:
		return
	
	var aggression = get_aggression_multiplier()
	
	# Rotate
	rotation_angle += deg_to_rad(rotation_speed * aggression) * delta
	rotation_angle = Constants.wrap_angle(rotation_angle)
	
	# Circular movement
	var orbit_radius = 100.0
	var orbit_speed = 0.5 * aggression
	x = Constants.SCREEN_WIDTH / 2.0 + cos(age * orbit_speed) * orbit_radius
	y = Constants.SCREEN_HEIGHT / 2.0 + sin(age * orbit_speed) * orbit_radius
	
	# Update turret angles
	for turret in turrets:
		turret.angle += deg_to_rad(rotation_speed * aggression) * delta
		turret.angle = Constants.wrap_angle(turret.angle)
		
		# Spawn particle trail for active turrets (throttled)
		if not turret.destroyed and randf() < 0.25:
			var turret_pos = get_turret_position(turret)
			GameManager.create_particle(turret_pos, "normal", Color(1.0, 0.3, 0.2, 0.5))
	
	# Charge attack
	charge_timer += delta
	if charge_timer >= charge_duration:
		perform_charge_attack()
		charge_timer = 0.0

func fire():
	if is_destroying:
		return
	
	# Each turret fires independently
	for turret in turrets:
		if turret.destroyed:
			continue
		
		turret.fire_timer += last_delta
		if turret.fire_timer >= fire_rate:
			fire_turret(turret)
			turret.fire_timer = 0.0

func fire_turret(turret: Dictionary):
	var turret_pos = get_turret_position(turret)
	
	# Fire toward player
	if GameManager.player != null:
		var player = GameManager.player
		var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
		
		var to_player = player_pos - turret_pos
		var angle = atan2(to_player.y, to_player.x)
		
		var bullet = {
			"x": turret_pos.x,
			"y": turret_pos.y,
			"vx": cos(angle) * 250.0,
			"vy": sin(angle) * 250.0,
			"speed": 250.0,
			"damage": 1,
			"type": "boss"
		}
		GameManager.boss_bullets.append(bullet)

func perform_charge_attack():
	if is_destroying:
		return
	
	is_charging = true
	AudioManager.play_boss_charge()
	
	# Fire burst from all active turrets
	for turret in turrets:
		if turret.destroyed:
			continue
		
		var turret_pos = get_turret_position(turret)
		
		# Fire 8 bullets in a circle
		for i in range(8):
			var angle = (float(i) / 8.0) * TAU
			
			var bullet = {
				"x": turret_pos.x,
				"y": turret_pos.y,
				"vx": cos(angle) * 300.0,
				"vy": sin(angle) * 300.0,
				"speed": 300.0,
				"damage": 1,
				"type": "boss",
				"color": Color.YELLOW
			}
			GameManager.boss_bullets.append(bullet)
	
	# Visual effect
	GameManager.spawn_explosion(Vector2(x, y), 120, Color.YELLOW)

func get_turret_position(turret: Dictionary) -> Vector2:
	var offset_x = cos(turret.angle) * turret_distance
	var offset_y = sin(turret.angle) * turret_distance
	return Vector2(x + offset_x, y + offset_y)

func take_turret_damage(turret_index: int, damage: int) -> bool:
	if turret_index < 0 or turret_index >= turrets.size():
		return false
	
	var turret = turrets[turret_index]
	if turret.destroyed:
		return false
	
	turret.hp -= damage
	
	if turret.hp <= 0:
		turret.destroyed = true
		var pos = get_turret_position(turret)
		GameManager.spawn_explosion(pos, 70, Color.RED)
		GameManager.add_score(300)
		
		# Damage boss HP
		return take_damage(15)
	else:
		var pos = get_turret_position(turret)
		GameManager.spawn_explosion(pos, 25, Color(1.0, 0.5, 0.3))
	
	return false

func get_collision_shapes() -> Array:
	var shapes = []
	
	# Core collision
	shapes.append({
		"position": Vector2(x, y),
		"radius": 40.0,
		"is_core": true
	})
	
	# Turret collisions
	for i in range(turrets.size()):
		var turret = turrets[i]
		if not turret.destroyed:
			shapes.append({
				"position": get_turret_position(turret),
				"radius": turret_radius,
				"turret_index": i
			})
	
	return shapes

func update_destruction(delta: float):
	super.update_destruction(delta)
	
	# Spin faster while exploding
	rotation_angle += deg_to_rad(180.0) * delta
	
	# Multi-phase destruction
	var progress = (death_duration - death_timer) / death_duration
	
	# Phase 1 (0-0.25): Turret explosions
	if progress < 0.25:
		if randf() < 6.0 * delta:
			for turret in turrets:
				if not turret.destroyed and randf() < 0.3:
					var pos = get_turret_position(turret)
					GameManager.spawn_explosion(pos, 50, Color.RED)
	
	# Phase 2 (0.25-0.5): Core damage spreading
	elif progress < 0.5:
		if randf() < 8.0 * delta:
			var offset = Vector2(randf_range(-40, 40), randf_range(-40, 40))
			GameManager.spawn_explosion(Vector2(x, y) + offset, 45, Color.ORANGE)
	
	# Phase 3 (0.5-0.75): Rapid explosions all over
	elif progress < 0.75:
		if randf() < 12.0 * delta:
			for i in range(2):
				var offset = Vector2(randf_range(-60, 60), randf_range(-60, 60))
				GameManager.spawn_explosion(Vector2(x, y) + offset, 40, Color.YELLOW)
	
	# Phase 4 (0.75-1.0): Final massive detonation
	else:
		if randf() < 15.0 * delta:
			var offset = Vector2(randf_range(-80, 80), randf_range(-80, 80))
			GameManager.spawn_explosion(Vector2(x, y) + offset, 90, Color.WHITE)
