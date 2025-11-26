extends Node
# Particle entity - Visual effects system
# 4 types: normal, spark, smoke, explosion
# Each with unique physics and rendering

class_name ParticleEntity

static func create_normal(position: Vector2, velocity: Vector2, color: Color, size: float, life: float) -> Dictionary:
	return {
		"position": position,
		"vx": velocity.x,
		"vy": velocity.y,
		"size": size,
		"color": color,
		"life": life,
		"age": 0.0,
		"rotation": randf() * TAU,
		"rot_speed": randf_range(-4, 4),
		"type": "normal"
	}

static func create_spark(position: Vector2, velocity: Vector2, color: Color, size: float, life: float) -> Dictionary:
	var angle = atan2(velocity.y, velocity.x)
	
	return {
		"position": position,
		"vx": velocity.x,
		"vy": velocity.y,
		"size": size,
		"color": color,
		"life": life,
		"age": 0.0,
		"rotation": angle,  # Align with velocity
		"rot_speed": 0.0,
		"type": "spark"
	}

static func create_smoke(position: Vector2, velocity: Vector2, color: Color, size: float, life: float) -> Dictionary:
	return {
		"position": position,
		"vx": velocity.x,
		"vy": velocity.y,
		"size": size,
		"color": color,
		"life": life,
		"age": 0.0,
		"rotation": randf() * TAU,
		"rot_speed": randf_range(-1, 1),
		"type": "smoke"
	}

static func create_explosion(position: Vector2, velocity: Vector2, color: Color, size: float, life: float) -> Dictionary:
	return {
		"position": position,
		"vx": velocity.x,
		"vy": velocity.y,
		"size": size,
		"color": color,
		"life": life,
		"age": 0.0,
		"rotation": randf() * TAU,
		"rot_speed": randf_range(-6, 6),
		"type": "explosion"
	}

static func spawn_explosion_cluster(position: Vector2, count: int, base_color: Color):
	for i in range(count):
		var angle = randf() * TAU
		var speed = randf_range(50, 200)
		var velocity = Vector2(cos(angle) * speed, sin(angle) * speed)
		
		# Mix particle types
		var particle_type = randi() % 3
		var particle = null
		
		match particle_type:
			0:  # Normal
				particle = create_normal(
					position,
					velocity,
					base_color,
					randf_range(3, 6),
					randf_range(0.5, 1.0)
				)
			1:  # Spark
				particle = create_spark(
					position,
					velocity * 1.5,
					Color(1.0, 0.8, 0.3),
					randf_range(2, 4),
					randf_range(0.3, 0.6)
				)
			2:  # Smoke
				particle = create_smoke(
					position,
					velocity * 0.5,
					Color(0.6, 0.6, 0.6, 0.8),
					randf_range(4, 8),
					randf_range(0.8, 1.5)
				)
		
		if particle:
			GameManager.particles.append(particle)
