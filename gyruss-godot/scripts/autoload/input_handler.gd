extends Node
# Input Handler - Keyboard, mouse, and touch input
# Based on working src/game.js input system

# Input state
var left_pressed: bool = false
var right_pressed: bool = false
var fire_pressed: bool = false
var fire_just_pressed: bool = false
var missile_pressed: bool = false
var missile_just_pressed: bool = false

# Debug keys
var debug_invulnerable_pressed: bool = false
var debug_warp_pressed: bool = false
var debug_boss_pressed: bool = false
var restart_pressed: bool = false

# Mouse/touch state
var mouse_position: Vector2 = Vector2.ZERO
var is_touching: bool = false

func _ready():
	# Ensure we receive input
	set_process_input(true)

func _input(event):
	# Keyboard input
	if event is InputEventKey:
		var pressed = event.pressed
		
		match event.keycode:
			KEY_LEFT, KEY_A:
				left_pressed = pressed
			KEY_RIGHT, KEY_D:
				right_pressed = pressed
			KEY_SPACE:
				if pressed and not fire_pressed:
					fire_just_pressed = true
				fire_pressed = pressed
			KEY_M:
				if pressed and not missile_pressed:
					missile_just_pressed = true
				missile_pressed = pressed
			KEY_T:
				if pressed:
					debug_invulnerable_pressed = true
			KEY_W:
				if pressed:
					debug_warp_pressed = true
			KEY_B:
				if pressed:
					debug_boss_pressed = true
			KEY_R:
				if pressed:
					restart_pressed = true
			KEY_S:
				if pressed:
					AudioManager.toggle_sound()
	
	# Mouse input
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			fire_pressed = event.pressed
			is_touching = event.pressed
			if event.pressed:
				fire_just_pressed = true
				mouse_position = event.position
	
	elif event is InputEventMouseMotion:
		if is_touching:
			mouse_position = event.position
	
	# Touch input
	elif event is InputEventScreenTouch:
		fire_pressed = event.pressed
		is_touching = event.pressed
		if event.pressed:
			fire_just_pressed = true
			mouse_position = event.position
	
	elif event is InputEventScreenDrag:
		if is_touching:
			mouse_position = event.position

func _process(_delta):
	# Clear "just pressed" flags each frame
	if fire_just_pressed:
		fire_just_pressed = false
	if missile_just_pressed:
		missile_just_pressed = false

func get_player_angle_from_mouse() -> float:
	var dx = mouse_position.x - Constants.SCREEN_CENTER.x
	var dy = mouse_position.y - Constants.SCREEN_CENTER.y
	return atan2(dy, dx)

func clear_debug_keys():
	debug_invulnerable_pressed = false
	debug_warp_pressed = false
	debug_boss_pressed = false
	restart_pressed = false

# Helper functions for entities
func is_left_pressed() -> bool:
	return left_pressed

func is_right_pressed() -> bool:
	return right_pressed

func is_fire_pressed() -> bool:
	return fire_pressed

func is_missile_pressed() -> bool:
	return missile_just_pressed

var debug_mode: bool = false

