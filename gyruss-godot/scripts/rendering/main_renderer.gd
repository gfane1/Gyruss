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
		
		# Smoke rises and has turbulence
		if p.type == "smoke":
			p.vy -= 20.0 * delta
			# Add turbulence - random drift
			p.vx += randf_range(-15.0, 15.0) * delta
			p.vy += randf_range(-10.0, 10.0) * delta
		
		# Update rotation
		p.rotation += p.rot_speed * delta
		
		# Age particle
		p.age += delta
		if p.age >= p.life:
			GameManager.particles.remove_at(i)
		
		i -= 1

func _draw():
	# Apply screen shake if active
	if GameManager.shake_timer > 0:
		var shake_offset = Vector2(
			randf_range(-GameManager.shake_magnitude, GameManager.shake_magnitude),
			randf_range(-GameManager.shake_magnitude, GameManager.shake_magnitude)
		)
		draw_set_transform(shake_offset, 0, Vector2.ONE)
	
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
	
	# Reset transform (clear screen shake)
	if GameManager.shake_timer > 0:
		draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func draw_background():
	# Purple/blue radial gradient
	var gradient_colors = PackedColorArray([
		Color(0.1, 0.05, 0.2),  # Dark purple center
		Color(0.05, 0.05, 0.15)  # Darker blue edges
	])
	
	# Draw as filled rectangle with color modulation
	draw_rect(Rect2(0, 0, Constants.SCREEN_WIDTH, Constants.SCREEN_HEIGHT), gradient_colors[1])

func draw_nebula():
	# 3-layer animated nebula with color cycling
	# Based on HTML/JS src/game.js nebula implementation
	var center = Constants.SCREEN_CENTER
	var max_radius = Constants.SCREEN_WIDTH * 0.8
	
	# Layer 1: Red/Orange nebula
	# Alpha oscillates: 0.08 + sin(time * 0.3) * 0.03
	var alpha1 = 0.08 + sin(world_time * 0.3) * 0.03
	# Animate center position
	var offset1_x = sin(world_time * 0.2) * 30.0
	var offset1_y = cos(world_time * 0.15) * 30.0
	var center1 = center + Vector2(offset1_x, offset1_y)
	draw_radial_gradient(center1, max_radius, Color(1.0, 0.4, 0.27, alpha1), Color(0.8, 0.13, 0.0, 0.0))
	
	# Layer 2: Blue/Purple nebula
	# Alpha oscillates: 0.06 + sin(time * 1.3) * 0.02
	var alpha2 = 0.06 + sin(world_time * 1.3) * 0.02
	# Animate center with different frequency
	var offset2_x = sin(world_time * 0.5) * 40.0
	var offset2_y = cos(world_time * 0.4) * 35.0
	var center2 = center + Vector2(offset2_x, offset2_y)
	draw_radial_gradient(center2, max_radius, Color(0.4, 0.27, 1.0, alpha2), Color(0.13, 0.0, 0.53, 0.0))
	
	# Layer 3: Green/Teal nebula
	# Alpha oscillates: 0.04 + sin(time * 0.9) * 0.015
	var alpha3 = 0.04 + sin(world_time * 0.9) * 0.015
	# Slowest animation
	var offset3_x = sin(world_time * 0.25) * 25.0
	var offset3_y = cos(world_time * 0.2) * 20.0
	var center3 = center + Vector2(offset3_x, offset3_y)
	draw_radial_gradient(center3, max_radius, Color(0.27, 1.0, 0.53, alpha3), Color(0.0, 0.8, 0.6, 0.0))

func draw_radial_gradient(center_pos: Vector2, radius: float, inner_color: Color, outer_color: Color):
	# Helper function to draw radial gradient using circle segments
	# Godot doesn't have built-in radial gradients for canvas, so we approximate
	# Draw concentric circles with interpolated colors
	var steps = 20
	for i in range(steps, 0, -1):
		var t = float(i) / float(steps)
		var current_radius = radius * t
		var color = inner_color.lerp(outer_color, 1.0 - t)
		draw_circle(center_pos, current_radius, color)

func draw_starfield():
	for star in GameManager.stars:
		var pos = Constants.polar_to_cartesian(star.angle, star.radius)
		
		# Twinkling effect for brighter stars (variable speed per star)
		var pulse = 1.0
		if star.tier >= 2:
			pulse = 0.8 + 0.2 * sin(world_time * star.twinkle_speed + star.twinkle_phase)
		
		var draw_color = Color(
			star.color.r,
			star.color.g,
			star.color.b,
			star.color.a * pulse
		)
		
		# Shadow blur glow for tiers 2-3 (bright and brilliant stars)
		if star.tier >= 2:
			var glow_layers = 3
			for i in range(glow_layers, 0, -1):
				var glow_radius = star.size * (1.5 + i * 0.8)
				var glow_alpha = draw_color.a * (0.15 / i)
				var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, glow_alpha)
				draw_circle(pos, glow_radius, glow_color)
		
		# Main star
		draw_circle(pos, star.size, draw_color)
		
		# Cross rays for brilliant stars (tier 3)
		if star.tier == 3:
			var ray_length = star.size * 6.0
			var ray_color = Color(1.0, 1.0, 1.0, draw_color.a * 0.6)
			# Draw 8 rays at 45° intervals
			for i in range(8):
				var angle = (float(i) / 8.0) * TAU
				var ray_start = pos + Vector2(cos(angle), sin(angle)) * star.size * 1.5
				var ray_end = pos + Vector2(cos(angle), sin(angle)) * ray_length
				draw_line(ray_start, ray_end, ray_color, 1.0)

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
		
		# Enemy with gradient hull (2-3 color layers)
		var color_index = int(abs(enemy.angle * 10)) % Constants.ENEMY_COLORS.size()
		var base_color = Color(Constants.ENEMY_COLORS[color_index])
		
		# Variant selection based on type
		var variant = 0 if enemy.type == "fighter" else 1
		
		# Multi-layer gradient effect
		if variant == 0:
			# Fighter variant: darker outer, lighter inner
			draw_circle(pos, size, base_color.darkened(0.3))
			draw_circle(pos, size * 0.7, base_color)
			draw_circle(pos, size * 0.4, base_color.lightened(0.3))
		else:
			# Saucer variant: lighter outer, darker inner with accent
			draw_circle(pos, size, base_color.lightened(0.2))
			draw_circle(pos, size * 0.75, base_color)
			draw_circle(pos, size * 0.5, base_color.darkened(0.2))
			draw_circle(pos, size * 0.25, Color.WHITE)

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
	
	# Draw based on boss type
	if boss is CosmicSerpent:
		draw_cosmic_serpent(boss)
	elif boss is StarDestroyer:
		draw_star_destroyer(boss)
	elif boss is GalacticCore:
		draw_galactic_core(boss)
	else:
		# Fallback simple rendering
		draw_circle(pos, 50.0, Color.RED)
		draw_circle(pos, 40.0, Color(1.0, 0.5, 0.0))

func draw_cosmic_serpent(boss: CosmicSerpent):
	# Draw segments with glow effect
	for i in range(boss.segments.size()):
		var segment = boss.segments[i]
		if segment.destroyed:
			continue
		
		var seg_pos = Vector2(segment.x, segment.y)
		var health_ratio = float(segment.hp) / float(segment.max_hp)
		
		# Energy glow (pulsing)
		var pulse = 1.0 + 0.15 * sin(world_time * 8.0 + i * 0.5)
		var glow_color = Color(0.6, 0.3, 0.8, 0.4 * health_ratio)
		draw_circle(seg_pos, 28.0 * pulse, glow_color)
		draw_circle(seg_pos, 22.0, Color(0.7, 0.4, 0.9, 0.6 * health_ratio))
		
		# Segment body (purple gradient)
		draw_circle(seg_pos, 20.0, Color(0.5, 0.2, 0.7))
		draw_circle(seg_pos, 16.0, Color(0.6, 0.3, 0.8))
		
		# Core highlight
		draw_circle(seg_pos, 8.0, Color(0.8, 0.5, 1.0, 0.7))

func draw_star_destroyer(boss: StarDestroyer):
	var pos = Vector2(boss.x, boss.y)
	
	# Core with energy glow
	var pulse = 1.0 + 0.2 * sin(world_time * 10.0)
	draw_circle(pos, 55.0 * pulse, Color(1.0, 0.3, 0.2, 0.3))
	draw_circle(pos, 45.0, Color(1.0, 0.4, 0.2, 0.5))
	draw_circle(pos, 40.0, Color(0.8, 0.2, 0.1))
	draw_circle(pos, 30.0, Color(1.0, 0.5, 0.3))
	draw_circle(pos, 20.0, Color(1.0, 0.7, 0.5, 0.8))
	
	# Draw turrets
	for i in range(boss.turrets.size()):
		var turret = boss.turrets[i]
		if turret.destroyed:
			continue
		
		var turret_pos = boss.get_turret_position(turret)
		var health_ratio = float(turret.hp) / float(turret.max_hp)
		
		# Turret energy glow
		var turret_pulse = 1.0 + 0.1 * sin(world_time * 12.0 + i * 0.8)
		draw_circle(turret_pos, 20.0 * turret_pulse, Color(1.0, 0.4, 0.0, 0.3 * health_ratio))
		draw_circle(turret_pos, 16.0, Color(1.0, 0.3, 0.0, 0.5 * health_ratio))
		
		# Turret body (red)
		draw_circle(turret_pos, 15.0, Color(0.9, 0.2, 0.1))
		draw_circle(turret_pos, 10.0, Color(1.0, 0.4, 0.2))
		
		# Turret barrel indicator
		var barrel_angle = turret.angle
		var barrel_end = turret_pos + Vector2(cos(barrel_angle), sin(barrel_angle)) * 12.0
		draw_line(turret_pos, barrel_end, Color(1.0, 0.6, 0.3), 3.0)

func draw_galactic_core(boss: GalacticCore):
	var pos = Vector2(boss.x, boss.y)
	
	# Core with intense energy glow
	var pulse = 1.0 + 0.25 * sin(world_time * 12.0)
	draw_circle(pos, 70.0 * pulse, Color(0.2, 0.8, 1.0, 0.3))
	draw_circle(pos, 58.0, Color(0.3, 0.9, 1.0, 0.5))
	draw_circle(pos, 50.0, Color(0.2, 0.7, 0.9))
	draw_circle(pos, 40.0, Color(0.4, 1.0, 1.0))
	draw_circle(pos, 30.0, Color(0.6, 1.0, 1.0, 0.9))
	draw_circle(pos, 20.0, Color(0.8, 1.0, 1.0, 0.8))
	
	# Energy ring rotation
	var ring_rotation = world_time * 2.0
	for i in range(12):
		var ring_angle = ring_rotation + (float(i) / 12.0) * TAU
		var ring_pos = pos + Vector2(cos(ring_angle), sin(ring_angle)) * 55.0
		draw_circle(ring_pos, 3.0, Color(0.5, 1.0, 1.0, 0.6))
	
	# Draw orbitals
	for i in range(boss.orbitals.size()):
		var orbital = boss.orbitals[i]
		if orbital.destroyed:
			continue
		
		var orbital_pos = boss.get_orbital_position(orbital)
		var health_ratio = float(orbital.hp) / float(orbital.max_hp)
		
		# Orbital energy glow
		var orbital_pulse = 1.0 + 0.12 * sin(world_time * 15.0 + i * 1.2)
		draw_circle(orbital_pos, 25.0 * orbital_pulse, Color(0.3, 0.9, 1.0, 0.3 * health_ratio))
		draw_circle(orbital_pos, 20.0, Color(0.4, 1.0, 1.0, 0.5 * health_ratio))
		
		# Orbital body (cyan)
		draw_circle(orbital_pos, 18.0, Color(0.3, 0.8, 0.9))
		draw_circle(orbital_pos, 14.0, Color(0.5, 1.0, 1.0))
		draw_circle(orbital_pos, 8.0, Color(0.7, 1.0, 1.0, 0.8))
	
	# Draw active energy beams
	for beam in boss.active_beams:
		var alpha = 1.0 - (beam.age / beam.duration)
		var beam_color = Color(beam.color.r, beam.color.g, beam.color.b, alpha * 0.8)
		
		# Multiple passes for glow effect
		draw_line(beam.start, beam.end, Color(beam_color.r, beam_color.g, beam_color.b, alpha * 0.2), beam.width * 3.0)
		draw_line(beam.start, beam.end, Color(beam_color.r, beam_color.g, beam_color.b, alpha * 0.5), beam.width * 2.0)
		draw_line(beam.start, beam.end, beam_color, beam.width)
		draw_line(beam.start, beam.end, Color.WHITE, beam.width * 0.4)

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
	
	# Multi-layer thrusters with flicker animation (25-30 Hz)
	var thruster_flicker = 0.7 + 0.3 * sin(world_time * 28.0) + randf() * 0.1
	var left_pos = Vector2(-size * 0.3, size * 0.5)
	var right_pos = Vector2(size * 0.3, size * 0.5)
	
	# Draw both thrusters
	for thruster_pos in [left_pos, right_pos]:
		# Layer 3: Outer glow (orange)
		draw_circle(thruster_pos, 5.0 * thruster_flicker, Color(1.0, 0.4, 0.0, 0.3))
		# Layer 2: Inner glow (bright orange)
		draw_circle(thruster_pos, 3.5 * thruster_flicker, Color(1.0, 0.6, 0.0, 0.6))
		# Layer 1: White-hot core
		draw_circle(thruster_pos, 2.0 * thruster_flicker, Color(1.0, 1.0, 0.9, 0.9))
	
	# Side nozzles (small accent details)
	draw_circle(Vector2(-size * 0.45, size * 0.2), 1.5, Color(0.5, 0.5, 0.5, 0.6))
	draw_circle(Vector2(size * 0.45, size * 0.2), 1.5, Color(0.5, 0.5, 0.5, 0.6))
	
	# Reset transform
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func draw_player_bullets():
	for bullet in GameManager.bullets:
		var pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
		var weapon = bullet.get("weapon", Constants.WEAPONS.Laser)
		var color = weapon.get("color", Color.CYAN)
		var size = weapon.get("size", 3.0)
		
		# Enhanced weapon rendering based on type
		var weapon_name = weapon.get("name", "Laser")
		
		if weapon_name == "Laser":
			# Laser with white-hot energy core
			draw_circle(pos, size * 1.8, Color(color.r, color.g, color.b, 0.3))  # Outer glow
			draw_circle(pos, size * 1.2, Color(color.r, color.g, color.b, 0.6))  # Mid glow
			draw_circle(pos, size, color)  # Main bullet
			draw_circle(pos, size * 0.5, Color(1.0, 1.0, 1.0, 0.9))  # White-hot core
		elif weapon_name == "Plasma":
			# Plasma with intense radial glow and pulse
			var pulse = 1.0 + 0.2 * sin(world_time * 15.0)
			draw_circle(pos, size * 2.5 * pulse, Color(color.r, color.g, color.b, 0.2))  # Large glow
			draw_circle(pos, size * 1.8 * pulse, Color(color.r, color.g, color.b, 0.4))  # Mid glow
			draw_circle(pos, size * 1.2, Color(color.r, color.g, color.b, 0.7))  # Inner glow
			draw_circle(pos, size, color)  # Core
			draw_circle(pos, size * 0.6, Color(1.0, 0.9, 1.0, 0.8))  # Bright center
		else:
			# Wave and other weapons - simple enhanced rendering
			draw_circle(pos, size * 1.5, Color(color.r, color.g, color.b, 0.3))
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
			# Elongated spark with glow
			# Draw glow halo first
			var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, alpha * 0.3)
			draw_circle(p.position, current_size * 3.0, glow_color)
			
			# Draw main spark (elongated)
			draw_set_transform(p.position, p.rotation, Vector2(2.5, 0.6))
			draw_circle(Vector2.ZERO, current_size, draw_color)
			draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
		elif p.type == "smoke":
			# Multi-layer smoke with turbulent appearance
			for layer in range(3):
				var layer_scale = 0.6 + layer * 0.2
				var layer_alpha = (0.4 - layer * 0.1) * life_ratio
				var smoke_color = Color(p.color.r, p.color.g, p.color.b, layer_alpha)
				draw_circle(p.position, p.size * layer_scale * (1.0 + p.age * 0.5), smoke_color)
		elif p.type == "explosion":
			# Explosion particle with bright glow and shadow blur effect
			# Outer glow (shadow blur simulation)
			var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, alpha * 0.2)
			draw_circle(p.position, current_size * 4.0, glow_color)
			draw_circle(p.position, current_size * 2.5, Color(draw_color.r, draw_color.g, draw_color.b, alpha * 0.4))
			# Core
			draw_circle(p.position, current_size, draw_color)
			# Hot center
			draw_circle(p.position, current_size * 0.5, Color(1.0, 1.0, 1.0, alpha * 0.8))
		else:
			# Normal particle with subtle glow
			var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, alpha * 0.3)
			draw_circle(p.position, current_size * 1.8, glow_color)
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
