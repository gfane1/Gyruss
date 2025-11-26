extends Node
# Satellite entity - Power-up carriers
# Spawns off-screen at negative radius, moves inward
# Carries weapons, missiles, or upgrades

class_name SatelliteEntity

static func create(angle: float, powerup_type: String) -> Dictionary:
	var satellite = {
		"angle": angle,
		"radius": -100.0,  # Start off-screen
		"enter_speed": 120.0,
		"has_powerup": true,
		"powerup_type": powerup_type,
		"oscillation_amplitude": deg_to_rad(10.0),
		"oscillation_frequency": 3.0,
		"base_angle": angle,
		"age": 0.0,
		"lifetime": 8.0,
		"state": "entering"
	}
	
	return satellite

static func update(satellite: Dictionary, delta: float):
	satellite.age += delta
	
	# Expire after lifetime
	if satellite.age >= satellite.lifetime:
		return true  # Mark for removal
	
	match satellite.state:
		"entering":
			update_entering(satellite, delta)
		"orbiting":
			update_orbiting(satellite, delta)
	
	return false

static func update_entering(satellite: Dictionary, delta: float):
	# Move inward
	satellite.radius += satellite.enter_speed * delta
	
	# Oscillate
	var oscillation = sin(satellite.age * satellite.oscillation_frequency) * satellite.oscillation_amplitude
	satellite.angle = satellite.base_angle + oscillation
	satellite.angle = Constants.wrap_angle(satellite.angle)
	
	# Transition to orbiting when reaching orbit zone
	if satellite.radius >= Constants.PLAYER_ORBIT_RADIUS - 80.0:
		satellite.state = "orbiting"
		satellite.orbit_start_angle = satellite.angle

static func update_orbiting(satellite: Dictionary, delta: float):
	# Orbit around player ring
	satellite.radius = Constants.PLAYER_ORBIT_RADIUS - 60.0
	satellite.angle += deg_to_rad(60.0) * delta
	satellite.angle = Constants.wrap_angle(satellite.angle)
	
	# Check collision with player
	if check_player_collision(satellite):
		return true  # Collected!
	
	return false

static func check_player_collision(satellite: Dictionary) -> bool:
	if GameManager.player == null:
		return false
	
	if not satellite.has_powerup:
		return false
	
	var player = GameManager.player
	var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
	var sat_pos = Constants.polar_to_cartesian(satellite.angle, satellite.radius)
	
	var dist_sq = Constants.dist_sq_vec(player_pos, sat_pos)
	var collect_radius = 30.0
	
	if dist_sq <= collect_radius * collect_radius:
		# Collected!
		apply_powerup(satellite)
		return true
	
	return false

static func apply_powerup(satellite: Dictionary):
	var powerup = satellite.powerup_type
	var player = GameManager.player
	
	# Weapon powerups
	if powerup in ["Plasma", "Wave"]:
		player.change_weapon(powerup)
	
	# Missile powerup
	elif powerup == "Missile":
		player.add_missile()
	
	# Upgrade powerups
	elif powerup in Constants.UPGRADES:
		player.apply_upgrade(powerup)
	
	# Visual feedback
	var pos = Constants.polar_to_cartesian(satellite.angle, satellite.radius)
	GameManager.spawn_explosion(pos, 15, Color.GREEN)
	AudioManager.play_powerup()
