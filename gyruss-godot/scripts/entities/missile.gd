extends Node
# Missile entity - Homing missiles with blast radius
# Uses Cartesian coordinates (not polar)

class_name MissileEntity

static func update(missile: Dictionary, delta: float):
	missile.age += delta
	
	# Expire after lifetime
	if missile.age >= missile.lifetime:
		explode(missile)
		return true  # Mark for removal
	
	# Homing behavior
	if missile.target != null and not missile.target.is_empty():
		var missile_pos = Vector2(missile.x, missile.y)
		var target_pos = Constants.polar_to_cartesian(missile.target.angle, missile.target.radius)
		
		var to_target = target_pos - missile_pos
		var dist = to_target.length()
		
		if dist > 1.0:
			var desired_dir = to_target / dist
			var current_vel = Vector2(missile.vx, missile.vy)
			var current_speed = current_vel.length()
			
			# Turn toward target
			if current_speed > 1.0:
				var current_dir = current_vel / current_speed
				var new_dir = current_dir.lerp(desired_dir, missile.turn_rate * delta)
				new_dir = new_dir.normalized()
				
				missile.vx = new_dir.x * missile.speed
				missile.vy = new_dir.y * missile.speed
			else:
				missile.vx = desired_dir.x * missile.speed
				missile.vy = desired_dir.y * missile.speed
	
	# Move missile
	missile.x += missile.vx * delta
	missile.y += missile.vy * delta
	
	# Check collision with enemies
	if check_collision(missile):
		return true
	
	# Spawn trail particles
	spawn_trail(missile)
	
	return false

static func check_collision(missile: Dictionary) -> bool:
	var missile_pos = Vector2(missile.x, missile.y)
	var blast_radius_sq = missile.blast_radius * missile.blast_radius
	
	var i = GameManager.enemies.size() - 1
	while i >= 0:
		var enemy = GameManager.enemies[i]
		
		if enemy.radius < 0:
			i -= 1
			continue
		
		var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
		var dist_sq = Constants.dist_sq_vec(missile_pos, enemy_pos)
		
		if dist_sq <= blast_radius_sq:
			# Hit! Explode missile
			explode(missile)
			return true
		
		i -= 1
	
	return false

static func explode(missile: Dictionary):
	var explosion_pos = Vector2(missile.x, missile.y)
	
	# Visual explosion
	GameManager.spawn_explosion(explosion_pos, 40, Color.YELLOW)
	AudioManager.play_explosion()
	
	# Damage all enemies in blast radius
	var blast_radius_sq = missile.blast_radius * missile.blast_radius
	
	var i = GameManager.enemies.size() - 1
	while i >= 0:
		var enemy = GameManager.enemies[i]
		
		if enemy.radius < 0:
			i -= 1
			continue
		
		var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
		var dist_sq = Constants.dist_sq_vec(explosion_pos, enemy_pos)
		
		if dist_sq <= blast_radius_sq:
			var destroyed = EnemyEntity.take_damage(enemy, missile.damage)
			
			if destroyed:
				GameManager.add_score(enemy.score_value)
				GameManager.spawn_explosion(enemy_pos, 20, Color.ORANGE)
				GameManager.enemies.remove_at(i)
		
		i -= 1
	
	# Missile removal handled by GameManager loop

static func spawn_trail(missile: Dictionary):
	# Small smoke trail
	if randf() < 0.3:
		var particle = {
			"position": Vector2(missile.x, missile.y),
			"vx": randf_range(-20, 20),
			"vy": randf_range(-20, 20),
			"size": randf_range(2, 4),
			"color": Color(0.8, 0.8, 0.8, 0.6),
			"life": 0.5,
			"age": 0.0,
			"rotation": randf() * TAU,
			"rot_speed": randf_range(-2, 2),
			"type": "smoke"
		}
		GameManager.particles.append(particle)
