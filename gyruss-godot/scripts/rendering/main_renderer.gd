extends Node2D
# Main Renderer - Global canvas with layered rendering pipeline
# Replaces per-node _draw() with single centralized renderer
# Based on working src/game.js canvas drawing system

var world_time: float = 0.0

func _ready():
	z_index = 0  # Base layer

func _process(delta):
	world_time += delta
	
	# Update starfield (move stars outward!)
	update_starfield(delta)
	
	# Update particles
	update_particles(delta)
	
	# Request redraw every frame
	queue_redraw()

func update_starfield(delta: float):
	var warp_factor = 15.0 if GameManager.state == GameManager.GameState.WARP else 1.0
	
	for star in GameManager.stars:
		# Move OUTWARD from center (correct direction!)
		star.radius += star.speed * delta * warp_factor * star.parallax
		
		# Respawn at CENTER when reaching edge (not at edge!)
		if star.radius > 450.0:  # Half screen width
			star.radius = Constants.rand_range(Constants.STARFIELD_SPAWN_RADIUS_MIN, Constants.STARFIELD_SPAWN_RADIUS_MAX)
			star.angle = randf() * TAU

func update_particles(delta: float):
	var i = GameManager.particles.size() - 1
	while i >= 0:
		var p = GameManager.particles[i]
		
		# Update position
		p.position.x += p.vx * delta
		p.position.y += p.vy * delta
		
		# Apply friction
		p.vx *= Constants.PARTICLE_FRICTION
		p.vy *= Constants.PARTICLE_FRICTION
		
		# Smoke rises
		if p.type == "smoke":
			p.vy -= 20.0 * delta
		
		# Update rotation
		p.rotation += p.rot_speed * delta
		
		# Age particle
		p.age += delta
		if p.age >= p.life:
			GameManager.particles.remove_at(i)
		
		i -= 1

func _draw():
	# Layer 1: Background gradient
	draw_background()
	
	# Layer 2: Animated nebula (3 layers with color cycling)
	draw_nebula()
	
	# Layer 3: Starfield
	draw_starfield()
	
	# Layer 4: Orbit ring
	draw_orbit_ring()
	
	# Layer 5: Enemies
	draw_enemies()
	
	# Layer 6: Satellites
	draw_satellites()
	
	# Layer 7: Boss
	draw_boss()
	
	# Layer 8: Enemy bullets
	draw_enemy_bullets()
	
	# Layer 9: Player
	draw_player()
	
	# Layer 10: Player bullets
	draw_player_bullets()
	
	# Layer 11: Missiles
	draw_missiles()
	
	# Layer 12: Particles
	draw_particles()
	
	# Layer 13: Warp effect
	if GameManager.state == GameManager.GameState.WARP:
		draw_warp_effect()

func draw_background():
	# Purple/blue radial gradient
	var gradient_colors = PackedColorArray([
		Color(0.1, 0.05, 0.2),  # Dark purple center
		Color(0.05, 0.05, 0.15)  # Darker blue edges
	])
	
	# Draw as filled rectangle with color modulation
	draw_rect(Rect2(0, 0, Constants.SCREEN_WIDTH, Constants.SCREEN_HEIGHT), gradient_colors[1])

func draw_starfield():
	for star in GameManager.stars:
		var pos = Constants.polar_to_cartesian(star.angle, star.radius)
		
		# Twinkling effect for brighter stars
		var pulse = 1.0
		if star.tier >= 2:
			pulse = 0.8 + 0.2 * sin(world_time * star.twinkle_speed + star.twinkle_phase)
		
		var draw_color = Color(
			star.color.r,
			star.color.g,
			star.color.b,
			star.color.a * pulse
		)
		
		draw_circle(pos, star.size, draw_color)
		
		# Glow for brilliant stars
		if star.tier == 3:
			var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, draw_color.a * 0.3)
			draw_circle(pos, star.size * 2.0, glow_color)

func draw_orbit_ring():
	# Cyan orbit ring with glow
	var ring_color = Color(0.0, 0.8, 1.0, 0.3)
	draw_arc(
		Constants.SCREEN_CENTER,
		Constants.PLAYER_ORBIT_RADIUS,
		0, TAU, 64, ring_color, 2.0
	)

func draw_enemies():
	for enemy in GameManager.enemies:
		if enemy.radius < 0:
			continue  # Off-screen, don't draw
		
		var pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
		var size = Constants.ENEMY_FIGHTER_SIZE if enemy.type == "fighter" else Constants.ENEMY_SAUCER_SIZE
		
		# Simple colored circle for now
		var color_index = int(abs(enemy.angle * 10)) % Constants.ENEMY_COLORS.size()
		var color = Color(Constants.ENEMY_COLORS[color_index])
		
		draw_circle(pos, size, color)
		draw_circle(pos, size * 0.6, Color.WHITE)

func draw_satellites():
	for sat in GameManager.satellites:
		if sat.radius < 0:
			continue
		
		var pos = Constants.polar_to_cartesian(sat.angle, sat.radius)
		var size = 15.0
		
		# Yellow/orange satellite
		draw_circle(pos, size, Color(1.0, 0.8, 0.0))
		draw_circle(pos, size * 0.7, Color(1.0, 0.6, 0.0))
		
		# Powerup indicator
		if sat.has_powerup:
			draw_circle(pos, size * 0.4, Color.GREEN)

func draw_boss():
	var boss = GameManager.boss_instance
	if boss == null:
		return

	var pos = Vector2(boss.x, boss.y)
	draw_circle(pos, 50.0, Color.RED)
	draw_circle(pos, 40.0, Color(1.0, 0.5, 0.0))

func draw_enemy_bullets():
	for bullet in GameManager.enemy_bullets:
		var pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
		draw_circle(pos, 4.0, Color.RED)

func draw_player():
	if GameManager.player == null:
		return
	
	var player = GameManager.player
	
	# Check if should draw (blinking during invulnerability)
	if player.hit_timer > 0:
		player.blink_timer += get_process_delta_time() * 8.0
		if int(player.blink_timer) % 2 == 0:
			return  # Skip drawing (blink effect)
	
	var pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	var ship_angle = player.angle + PI / 2.0  # Point toward center
	
	# Transform to player position and rotation
	draw_set_transform(pos, ship_angle, Vector2.ONE)
	
	# Simple player ship (triangle)
	var size = Constants.PLAYER_SIZE
	var points = PackedVector2Array([
		Vector2(0, -size),
		Vector2(-size * 0.6, size * 0.5),
		Vector2(size * 0.6, size * 0.5)
	])
	
	draw_colored_polygon(points, Color.CYAN)
	draw_polyline(points + PackedVector2Array([points[0]]), Color.WHITE, 1.5)
	
	# Thrusters
	var thruster_intensity = 0.7 + 0.3 * sin(world_time * 25.0)
	draw_circle(Vector2(-size * 0.3, size * 0.5), 3.0, Color(1.0, 0.5, 0.0, thruster_intensity))
	draw_circle(Vector2(size * 0.3, size * 0.5), 3.0, Color(1.0, 0.5, 0.0, thruster_intensity))
	
	# Reset transform
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func draw_player_bullets():
	for bullet in GameManager.bullets:
		var pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
		var weapon = bullet.get("weapon", Constants.WEAPONS.Laser)
		var color = weapon.get("color", Color.CYAN)
		var size = weapon.get("size", 3.0)
		
		draw_circle(pos, size, color)

func draw_missiles():
	for missile in GameManager.missiles:
		var pos = Vector2(missile.get("x", 0), missile.get("y", 0))
		draw_circle(pos, 5.0, Color.YELLOW)
		draw_circle(pos, 3.0, Color.WHITE)

func draw_particles():
	for p in GameManager.particles:
		var life_ratio = 1.0 - (p.age / p.life)
		var current_size = p.size * life_ratio
		var alpha = life_ratio
		
		var draw_color = Color(p.color.r, p.color.g, p.color.b, alpha)
		
		if p.type == "spark":
			# Elongated spark
			draw_set_transform(p.position, p.rotation, Vector2(2.5, 0.6))
			draw_circle(Vector2.ZERO, current_size, draw_color)
			draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
		elif p.type == "smoke":
			# Multi-layer smoke
			for layer in range(3):
				var layer_scale = 0.6 + layer * 0.2
				var layer_alpha = (0.4 - layer * 0.1) * life_ratio
				var smoke_color = Color(p.color.r, p.color.g, p.color.b, layer_alpha)
				draw_circle(p.position, p.size * layer_scale * (1.0 + p.age * 0.5), smoke_color)
		else:
			# Normal particle
			draw_circle(p.position, current_size, draw_color)

func draw_warp_effect():
	# Warp tunnel effect
	var warp_progress = GameManager.warp_timer / GameManager.WARP_DURATION
	var tunnel_alpha = sin(warp_progress * PI) * 0.5
	
	# Radial lines
	for i in range(16):
		var angle = (float(i) / 16.0) * TAU
		var start_radius = 50.0
		var end_radius = 450.0
		var start = Constants.polar_to_cartesian(angle, start_radius)
		var end_pos = Constants.polar_to_cartesian(angle, end_radius)
		draw_line(start, end_pos, Color(0.0, 0.8, 1.0, tunnel_alpha), 2.0)
