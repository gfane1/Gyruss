extends Node
# Bullet entity - Player and enemy projectiles
# Uses polar coordinates, moves radially

class_name BulletEntity

static func update_player_bullets(delta: float):
	var i = GameManager.bullets.size() - 1
	while i >= 0:
		var bullet = GameManager.bullets[i]
		
		# Move bullet radially (inward = negative speed)
		bullet.radius += bullet.speed * delta
		
		# Remove if off-screen
		if bullet.radius < 0 or bullet.radius > 450.0:
			GameManager.bullets.remove_at(i)
			i -= 1
			continue
		
		# Check collision with enemies
		check_enemy_collision(bullet, i)
		
		i -= 1

static func update_enemy_bullets(delta: float):
	var i = GameManager.enemy_bullets.size() - 1
	while i >= 0:
		var bullet = GameManager.enemy_bullets[i]
		
		# Move outward toward player orbit
		bullet.radius += bullet.speed * delta
		
		# Remove if past player orbit
		if bullet.radius > Constants.PLAYER_ORBIT_RADIUS + 50.0:
			GameManager.enemy_bullets.remove_at(i)
			i -= 1
			continue
		
		# Check collision with player
		if check_player_collision(bullet):
			GameManager.enemy_bullets.remove_at(i)
			i -= 1
			continue
		
		i -= 1

static func check_enemy_collision(bullet: Dictionary, bullet_index: int):
	var bullet_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
	var weapon = bullet.get("weapon", {})
	var aoe = weapon.get("aoe", 0.0)
	var pierce = weapon.get("pierce", false)

	var hit_any = false

	var i = GameManager.enemies.size() - 1
	while i >= 0:
		var enemy = GameManager.enemies[i]
		
		if enemy.radius < 0:
			i -= 1
			continue
		
		var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
		var collision_radius = EnemyEntity.get_collision_radius(enemy)
		var hit_radius = collision_radius + aoe
		
		var dist_sq = Constants.dist_sq_vec(bullet_pos, enemy_pos)
		var hit_dist_sq = hit_radius * hit_radius
		
		if dist_sq <= hit_dist_sq:
			# Hit!
			var destroyed = EnemyEntity.take_damage(enemy, bullet.damage)
			
			if destroyed:
				GameManager.add_score(enemy.score_value)
				GameManager.spawn_explosion(enemy_pos, 20, Color.ORANGE)
				AudioManager.play_explosion()
				GameManager.enemies.remove_at(i)
			
			hit_any = true
			
			if not pierce:
				break  # Bullet consumed
		
		i -= 1

	if check_boss_collision(bullet, bullet_pos):
		hit_any = true

	# Remove bullet if it hit and doesn't pierce
	if hit_any and not pierce:
		GameManager.bullets.remove_at(bullet_index)

static func check_boss_collision(bullet: Dictionary, bullet_pos: Vector2) -> bool:
	if GameManager.boss_instance == null:
		return false

	var weapon = bullet.get("weapon", {})
	var aoe = weapon.get("aoe", 0.0)
	var pierce = weapon.get("pierce", false)
	var hit_any = false

	var shapes = GameManager.boss_instance.get_collision_shapes()
	for shape in shapes:
		var center: Vector2 = shape.get("position", Vector2.ZERO)
		var radius = shape.get("radius", 20.0) + aoe
		var dist_sq = Constants.dist_sq_vec(bullet_pos, center)
		var hit_radius_sq = radius * radius
		if dist_sq <= hit_radius_sq:
			var destroyed = GameManager.apply_boss_damage(shape, bullet.damage)
			hit_any = true
			if destroyed:
				GameManager.spawn_explosion(center, 25, Color(1.0, 0.2, 1.0))
			if not pierce:
				break

	return hit_any

static func check_player_collision(bullet: Dictionary) -> bool:
	if GameManager.player == null:
		return false
	
	var player = GameManager.player
	var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	var bullet_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
	
	var dist_sq = Constants.dist_sq_vec(player_pos, bullet_pos)
	var hit_radius = Constants.PLAYER_SIZE + 5.0
	
	if dist_sq <= hit_radius * hit_radius:
		player.take_damage()
		return true
	
	return false
