extends Node
# Boss Base Class - Shared boss behavior
# All bosses have cinematic 4-6 second destruction sequences
# Movement intensifies as health decreases

class_name BossBase

var boss_type: String = "base"
var hp: int = 100
var max_hp: int = 100
var is_destroying: bool = false
var death_timer: float = 0.0
var death_duration: float = 5.0
var age: float = 0.0
var phase: int = 1

# Base position (usually center)
var x: float = 450.0
var y: float = 450.0

# Movement
var vx: float = 0.0
var vy: float = 0.0
var move_speed: float = 100.0

# Combat
var fire_timer: float = 0.0
var fire_rate: float = 1.0
var last_delta: float = 0.0

func _init():
	pass

func update(delta: float):
	last_delta = delta
	age += delta
	
	if is_destroying:
		update_destruction(delta)
		return
	
	# Update movement
	update_movement(delta)
	
	# Update firing
	fire_timer += delta
	if fire_timer >= fire_rate:
		fire()
		fire_timer = 0.0
	
	# Phase transitions based on health
	update_phase()

func update_movement(_delta: float):
	# Override in subclass
	pass

func fire():
	# Override in subclass
	pass

func update_phase():
	var health_ratio = float(hp) / float(max_hp)
	
	if health_ratio > 0.66:
		phase = 1
	elif health_ratio > 0.33:
		phase = 2
	else:
		phase = 3

func get_aggression_multiplier() -> float:
	# Increases as health decreases
	match phase:
		1:
			return 1.0
		2:
			return 1.5
		3:
			return 2.0
	return 1.0

func take_damage(damage: int) -> bool:
	if is_destroying:
		return false
	
	hp -= damage
	
	# Spawn hit particles
	var pos = Vector2(x, y)
	GameManager.spawn_explosion(pos, 50, Color.RED)
	AudioManager.play_hit()
	
	if hp <= 0:
		start_destruction()
		return true
	
	return false

func start_destruction():
	is_destroying = true
	death_timer = 0.0
	AudioManager.play_boss_death()

func update_destruction(delta: float):
	death_timer += delta
	
	# Spawn explosion particles throughout destruction
	var explosions_per_sec = 10.0
	if randf() < explosions_per_sec * delta:
		var offset_x = randf_range(-50, 50)
		var offset_y = randf_range(-50, 50)
		var pos = Vector2(x + offset_x, y + offset_y)
		GameManager.spawn_explosion(pos, 80, Color(1.0, 0.5, 0.0))
	
	# Final explosion
	if death_timer >= death_duration:
		final_explosion()
		GameManager.boss_defeated()

func final_explosion():
	# Massive explosion
	for i in range(50):
		var angle = (float(i) / 50.0) * TAU
		var distance = randf_range(0, 80)
		var offset = Vector2(cos(angle) * distance, sin(angle) * distance)
		var pos = Vector2(x, y) + offset
		GameManager.spawn_explosion(pos, 150, Color.YELLOW)
	
	AudioManager.play_explosion()

func get_collision_shapes() -> Array:
	# Override in subclass to return array of collision circles
	# Each element: {position: Vector2, radius: float}
	return []
