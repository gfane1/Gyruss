extends Node
# Enemy entity - Handles enemy behavior
# Spawns OFF-SCREEN at negative radius, moves INWARD
# Uses polar coordinates with sine oscillation

class_name EnemyEntity

static func create(type: String, angle: float, radius: float, enter_speed: float, phase: float = 0.0) -> Dictionary:
	var enemy = {
		"type": type,
		"angle": angle,
		"radius": radius,  # Start at NEGATIVE radius (off-screen)
		"enter_speed": enter_speed,  # Speed moving inward
		"phase": phase,  # For sine wave oscillation
		"oscillation_amplitude": deg_to_rad(15.0),  # Wiggle amount
		"oscillation_frequency": 2.0,  # Wiggle speed
		"base_angle": angle,  # Center line for oscillation
		"hp": 1,
		"max_hp": 1,
		"score_value": 100,
		"fire_timer": randf() * 2.0,  # Random initial fire delay
		"fire_rate": 1.5,
		"state": "entering",  # entering, attacking, leaving
		"age": 0.0
	}
	
	# Type-specific properties
	match type:
		"fighter":
			enemy.hp = Constants.ENEMY_FIGHTER_HP
			enemy.max_hp = Constants.ENEMY_FIGHTER_HP
			enemy.score_value = Constants.ENEMY_FIGHTER_SCORE
			enemy.fire_rate = 2.0
		"saucer":
			enemy.hp = Constants.ENEMY_SAUCER_HP
			enemy.max_hp = Constants.ENEMY_SAUCER_HP
			enemy.score_value = Constants.ENEMY_SAUCER_SCORE
			enemy.fire_rate = 1.5
			enemy.oscillation_amplitude = deg_to_rad(25.0)  # More wiggle
	
	return enemy

static func update(enemy: Dictionary, delta: float):
	enemy.age += delta

	match enemy.state:
		"entering":
			update_entering(enemy, delta)
		"attacking":
			update_attacking(enemy, delta)
		"leaving":
			update_leaving(enemy, delta)

static func update_entering(enemy: Dictionary, delta: float):
	# Move INWARD from negative radius
	enemy.radius += enemy.enter_speed * delta
	
	# Oscillate angle (sine wave)
	var oscillation = sin(enemy.age * enemy.oscillation_frequency) * enemy.oscillation_amplitude
	enemy.angle = enemy.base_angle + oscillation
	enemy.angle = Constants.wrap_angle(enemy.angle)
	
	# Transition to attacking when reaching attack zone
	if enemy.radius >= 200.0:
		enemy.state = "attacking"
		enemy.attack_start_time = enemy.age

static func update_attacking(enemy: Dictionary, delta: float):
	# Slow down in attack zone
	enemy.radius += enemy.enter_speed * 0.3 * delta
	
	# Continue oscillating
	var oscillation = sin(enemy.age * enemy.oscillation_frequency) * enemy.oscillation_amplitude
	enemy.angle = enemy.base_angle + oscillation
	enemy.angle = Constants.wrap_angle(enemy.angle)
	
	# Fire at player
	enemy.fire_timer += delta
	if enemy.fire_timer >= enemy.fire_rate:
		fire_at_player(enemy)
		enemy.fire_timer = 0.0
	
	# Leave after some time
	if enemy.age - enemy.get("attack_start_time", 0.0) > 5.0:
		enemy.state = "leaving"

static func update_leaving(enemy: Dictionary, delta: float):
	# Continue inward to center
	enemy.radius += enemy.enter_speed * delta
	
	# Spiral inward
	enemy.angle += deg_to_rad(90.0) * delta
	enemy.angle = Constants.wrap_angle(enemy.angle)

static func fire_at_player(enemy: Dictionary):
	if GameManager.player == null:
		return
	
	# Fire bullet toward player orbit
	var bullet = {
		"angle": enemy.angle,
		"radius": enemy.radius,
		"speed": 250.0,  # Positive = outward toward player
		"target_radius": Constants.PLAYER_ORBIT_RADIUS,
		"damage": 1
	}
	GameManager.enemy_bullets.append(bullet)
	AudioManager.play_enemy_fire()

static func take_damage(enemy: Dictionary, damage: int) -> bool:
	enemy.hp -= damage
	
	if enemy.hp <= 0:
		return true  # Enemy destroyed
	
	# Spawn hit particles
	var pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
	GameManager.spawn_explosion(pos, 8, Color.ORANGE)
	AudioManager.play_hit()
	
	return false

static func get_collision_radius(enemy: Dictionary) -> float:
	match enemy.type:
		"fighter":
			return Constants.ENEMY_FIGHTER_SIZE
		"saucer":
			return Constants.ENEMY_SAUCER_SIZE
		_:
			return 15.0
