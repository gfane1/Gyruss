extends Node
# Player entity - Handles player ship state and behavior
# Uses polar coordinates (angle on orbit ring)
# Weapon persistence through warps, reset only on death

class_name PlayerEntity

# State
var angle: float = 0.0  # Current angle on orbit ring
var lives: int = 3
var missiles: int = 3
var score_multiplier: int = 1

# Weapons
var current_weapon: Dictionary = Constants.WEAPONS.Laser
var weapon_level: int = 1

# Upgrades (stores remaining duration in seconds, 0.0 = inactive)
var upgrades: Dictionary = {
	"doubleShot": 0.0,
	"tripleShot": 0.0,
	"rapidFire": 0.0,
	"shield": 0.0,
	"speedBoost": 0.0
}

# Combat state
var hit_timer: float = 0.0
var invulnerable: bool = false
var blink_timer: float = 0.0
var fire_timer: float = 0.0

# Movement
var rotation_speed: float = 220.0  # deg/sec base speed

func _init():
	reset_position()

func reset_position():
	angle = 0.0  # Start at top

func update(delta: float):
	# Handle rotation
	var rotation_input = 0.0
	if InputHandler.is_left_pressed():
		rotation_input -= 1.0
	if InputHandler.is_right_pressed():
		rotation_input += 1.0
	
	# Apply speed boost
	var speed = rotation_speed
	if upgrades.speedBoost > 0.0:
		speed *= Constants.UPGRADES.speedBoost.multiplier
	
	# Update angle
	angle += rotation_input * deg_to_rad(speed) * delta
	angle = Constants.wrap_angle(angle)
	
	# Handle firing
	fire_timer += delta
	if InputHandler.is_fire_pressed():
		fire()
	
	# Handle missile launch
	if InputHandler.is_missile_pressed() and missiles > 0:
		fire_missile()
		InputHandler.missile_pressed = false  # Consume input
	
	# Update hit invulnerability
	if hit_timer > 0:
		hit_timer -= delta
		blink_timer += delta
	
	# Update upgrade timers
	for upgrade_key in upgrades.keys():
		if upgrades[upgrade_key] > 0.0:
			upgrades[upgrade_key] -= delta
			if upgrades[upgrade_key] <= 0.0:
				upgrades[upgrade_key] = 0.0

func fire():
	var fire_rate = current_weapon.get("fireRate", 0.15)
	if upgrades.rapidFire > 0.0:
		fire_rate *= 0.5  # Fire twice as fast
	
	if fire_timer < fire_rate:
		return
	
	fire_timer = 0.0
	
	# Determine shot count
	var shot_count = 1
	if upgrades.tripleShot > 0.0:
		shot_count = 3
	elif upgrades.doubleShot > 0.0:
		shot_count = 2
	
	# Fire bullets
	match current_weapon.name:
		"Laser":
			fire_laser(shot_count)
		"Plasma":
			fire_plasma(shot_count)
		"Wave":
			fire_wave(shot_count)

func fire_laser(shot_count: int):
	var spread = 0.0
	if shot_count > 1:
		spread = deg_to_rad(15.0)
	
	for i in range(shot_count):
		var offset = 0.0
		if shot_count == 2:
			offset = spread if i == 0 else -spread
		elif shot_count == 3:
			offset = (i - 1) * spread
		
		var bullet = {
			"angle": angle + offset,
			"radius": Constants.PLAYER_ORBIT_RADIUS - 20.0,
			"speed": -400.0,  # Negative = inward
			"weapon": current_weapon,
			"damage": current_weapon.damage * weapon_level
		}
		GameManager.bullets.append(bullet)
	
	AudioManager.play_laser()

func fire_plasma(shot_count: int):
	var spread = 0.0
	if shot_count > 1:
		spread = deg_to_rad(20.0)
	
	for i in range(shot_count):
		var offset = 0.0
		if shot_count == 2:
			offset = spread if i == 0 else -spread
		elif shot_count == 3:
			offset = (i - 1) * spread
		
		var bullet = {
			"angle": angle + offset,
			"radius": Constants.PLAYER_ORBIT_RADIUS - 20.0,
			"speed": -500.0,
			"weapon": current_weapon,
			"damage": current_weapon.damage * weapon_level,
			"pierce": current_weapon.pierce
		}
		GameManager.bullets.append(bullet)
	
	AudioManager.play_plasma()

func fire_wave(shot_count: int):
	# Wave weapon fires in arcs
	var arc_width = deg_to_rad(120.0)
	var bullets_per_wave = 8
	
	for wave_num in range(shot_count):
		var base_offset = (wave_num - shot_count / 2.0 + 0.5) * deg_to_rad(30.0)
		
		for i in range(bullets_per_wave):
			var t = float(i) / float(bullets_per_wave - 1)
			var offset = (t - 0.5) * arc_width + base_offset
			
			var bullet = {
				"angle": angle + offset,
				"radius": Constants.PLAYER_ORBIT_RADIUS - 20.0,
				"speed": -350.0,
				"weapon": current_weapon,
				"damage": current_weapon.damage * weapon_level,
				"aoe": current_weapon.aoe
			}
			GameManager.bullets.append(bullet)
	
	AudioManager.play_wave()

func fire_missile():
	if missiles <= 0:
		return
	
	missiles -= 1
	
	# Find closest enemy
	var target = find_closest_enemy()
	
	var player_pos = Constants.polar_to_cartesian(angle, Constants.PLAYER_ORBIT_RADIUS)
	
	var missile = {
		"x": player_pos.x,
		"y": player_pos.y,
		"vx": 0.0,
		"vy": -300.0,  # Initial velocity inward
		"target": target,
		"speed": 400.0,
		"turn_rate": 3.0,
		"age": 0.0,
		"lifetime": 5.0,
		"blast_radius": Constants.MISSILE_BLAST_RADIUS,
		"damage": Constants.MISSILE_DAMAGE
	}
	GameManager.missiles.append(missile)
	
	AudioManager.play_missile()

func find_closest_enemy():
	var player_pos = Constants.polar_to_cartesian(angle, Constants.PLAYER_ORBIT_RADIUS)
	var closest = null
	var min_dist_sq = INF
	
	for enemy in GameManager.enemies:
		if enemy.radius < 0:
			continue  # Off-screen
		
		var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
		var dist_sq = Constants.dist_sq_vec(player_pos, enemy_pos)
		
		if dist_sq < min_dist_sq:
			min_dist_sq = dist_sq
			closest = enemy
	
	return closest

func take_damage():
	if hit_timer > 0 or invulnerable:
		return
	
	if upgrades.shield > 0.0:
		# Shield absorbs hit
		upgrades.shield = 0.0
		hit_timer = 1.0
		AudioManager.play_hit()
		GameManager.spawn_explosion(
			Constants.polar_to_cartesian(angle, Constants.PLAYER_ORBIT_RADIUS),
			20, Color.BLUE
		)
		return
	
	lives -= 1
	hit_timer = 2.0
	blink_timer = 0.0
	
	AudioManager.play_hit()
	GameManager.spawn_explosion(
		Constants.polar_to_cartesian(angle, Constants.PLAYER_ORBIT_RADIUS),
		30, Color.CYAN
	)
	
	if lives <= 0:
		die()
	else:
		# Reset ONLY weapons and upgrades on death (not on warp!)
		reset_weapons_and_upgrades()

func die():
	GameManager.trigger_game_over()
	AudioManager.play_explosion()

func reset_weapons_and_upgrades():
	# Reset weapons to laser
	current_weapon = Constants.WEAPONS.Laser
	weapon_level = 1
	
	# Clear all upgrades
	for key in upgrades:
		upgrades[key] = 0.0
	
	# Keep lives and missiles (already decremented)

func apply_upgrade(upgrade_key: String):
	if upgrade_key in upgrades:
		var upgrade_def = Constants.UPGRADES.get(upgrade_key, {})
		var duration = upgrade_def.get("duration", 10.0)  # Default 10 seconds
		upgrades[upgrade_key] = duration
		AudioManager.play_powerup()
		GameManager.add_score(upgrade_def.get("score", 500))

func change_weapon(weapon_name: String):
	if weapon_name in Constants.WEAPONS:
		current_weapon = Constants.WEAPONS[weapon_name]
		weapon_level = 1
		AudioManager.play_powerup()

func add_missile():
	missiles = mini(missiles + 1, Constants.STARTING_MISSILES + 5)
	AudioManager.play_powerup()
	GameManager.add_score(500)
