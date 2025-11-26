extends BossBase
# Cosmic Serpent Boss - 10 segments with trailing movement
# Writhes across screen in serpentine pattern
# Each segment can be hit independently

class_name CosmicSerpent

var segments: Array = []
var segment_count: int = 10
var segment_spacing: float = 35.0
var segment_radius: float = 20.0

var trail_points: Array = []
var max_trail_length: int = 50

func _init():
	boss_type = "cosmic_serpent"
	hp = 200
	max_hp = 200
	death_duration = 5.0
	fire_rate = 0.8
	move_speed = 120.0
	
	x = Constants.SCREEN_WIDTH / 2.0
	y = 100.0
	
	# Initialize segments
	for i in range(segment_count):
		segments.append({
			"x": x,
			"y": y + i * segment_spacing,
			"hp": 20,
			"max_hp": 20,
			"destroyed": false
		})

func update_movement(delta: float):
	if is_destroying:
		return
	
	var aggression = get_aggression_multiplier()
	
	# Head follows sine wave pattern
	var wave_amplitude = 150.0
	var wave_frequency = 1.5 * aggression
	x = Constants.SCREEN_WIDTH / 2.0 + sin(age * wave_frequency) * wave_amplitude
	
	# Move down and up
	var vertical_speed = 80.0 * aggression
	y += vertical_speed * delta * sin(age * 0.5)
	
	# Keep on screen
	y = clampf(y, 100, Constants.SCREEN_HEIGHT - 100)
	
	# Update trail
	trail_points.push_front(Vector2(x, y))
	if trail_points.size() > max_trail_length:
		trail_points.pop_back()
	
	# Update segments to follow trail
	for i in range(segment_count):
		var trail_index = mini(i * 3, trail_points.size() - 1)
		if trail_index < trail_points.size():
			var target = trail_points[trail_index]
			segments[i].x = target.x
			segments[i].y = target.y

func fire():
	if is_destroying:
		return
	
	# Fire from head segment in 3 directions
	for i in range(-1, 2):
		var angle = deg_to_rad(90 + i * 30)  # Downward spread
		
		var bullet = {
			"x": x,
			"y": y,
			"vx": cos(angle) * 200.0,
			"vy": sin(angle) * 200.0,
			"speed": 200.0,
			"damage": 1,
			"type": "boss"
		}
		GameManager.boss_bullets.append(bullet)
	
	AudioManager.play_enemy_fire()

func take_segment_damage(segment_index: int, damage: int) -> bool:
	if segment_index < 0 or segment_index >= segments.size():
		return false
	
	var segment = segments[segment_index]
	if segment.destroyed:
		return false
	
	segment.hp -= damage
	
	if segment.hp <= 0:
		segment.destroyed = true
		var pos = Vector2(segment.x, segment.y)
		GameManager.spawn_explosion(pos, 15, Color.PURPLE)
		GameManager.add_score(500)
		
		# Damage boss HP
		return take_damage(10)
	else:
		var pos = Vector2(segment.x, segment.y)
		GameManager.spawn_explosion(pos, 5, Color(0.8, 0.4, 0.8))
	
	return false

func get_collision_shapes() -> Array:
	var shapes = []
	
	for i in range(segments.size()):
		var segment = segments[i]
		if not segment.destroyed:
			shapes.append({
				"position": Vector2(segment.x, segment.y),
				"radius": segment_radius,
				"segment_index": i
			})
	
	return shapes

func update_destruction(delta: float):
	super.update_destruction(delta)
	
	# Segments explode one by one
	var explosions_per_segment = death_duration / float(segment_count)
	var current_segment = int(death_timer / explosions_per_segment)
	
	if current_segment < segments.size():
		if randf() < 5.0 * delta:
			var segment = segments[current_segment]
			var pos = Vector2(segment.x, segment.y)
			GameManager.spawn_explosion(pos, 12, Color.PURPLE)
