extends Node2D
# UI Renderer - Dedicated HUD canvas layered above world rendering
# Renders score, player stats, planet info, upgrades, debug overlay, and state prompts

const UPGRADE_COLORS = {
	"doubleShot": Color(0.0, 1.0, 0.5),
	"tripleShot": Color(0.0, 1.0, 1.0),
	"rapidFire": Color(1.0, 0.5, 0.0),
	"shield": Color(0.5, 0.5, 1.0),
	"speedBoost": Color(1.0, 1.0, 0.0)
}

func _ready():
	set_process(true)
	z_index = 1000

func _process(_delta):
	queue_redraw()

func _draw():
	draw_hud()
	draw_state_messages()
	draw_debug_info()

func draw_hud():
	draw_score()
	draw_lives()
	draw_missiles()
	draw_planet_info()
	draw_weapon_info()
	draw_upgrades()

func draw_score():
	var label = "SCORE: " + str(GameManager.score).pad_zeros(8)
	draw_string(ThemeDB.fallback_font, Vector2(20, 30), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color.CYAN)

func draw_lives():
	if GameManager.player == null:
		return

	var lives = GameManager.player.lives
	var label = "LIVES: " + str(lives)
	draw_string(ThemeDB.fallback_font, Vector2(20, 55), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color.WHITE)

	for i in range(lives):
		var icon_pos = Vector2(100 + i * 25, 50)
		draw_circle(icon_pos, 8, Color.CYAN)

func draw_missiles():
	if GameManager.player == null:
		return

	var missiles = GameManager.player.missiles
	var label = "MISSILES: " + str(missiles)
	draw_string(ThemeDB.fallback_font, Vector2(20, 80), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color.YELLOW)

func draw_planet_info():
	var planet_name = Constants.PLANETS[GameManager.planet_index]
	var planet_text = "PLANET: " + planet_name
	var font = ThemeDB.fallback_font
	var width = font.get_string_size(planet_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 20).x
	draw_string(font, Vector2(Constants.SCREEN_WIDTH - width - 20, 30), planet_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(0.0, 1.0, 0.5))

	var warp_text = str(GameManager.warps_to_planet) + " WARPS TO " + planet_name
	var warp_width = font.get_string_size(warp_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
	draw_string(font, Vector2(Constants.SCREEN_WIDTH - warp_width - 20, 55), warp_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(0.6, 0.8, 1.0))

func draw_weapon_info():
	if GameManager.player == null:
		return

	var weapon = GameManager.player.current_weapon
	var label = "WEAPON: " + weapon.name
	var font = ThemeDB.fallback_font
	var width = font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
	draw_string(font, Vector2(Constants.SCREEN_WIDTH - width - 20, 80), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, weapon.color)

func draw_upgrades():
	if GameManager.player == null:
		return

	var upgrades = GameManager.player.upgrades
	var font = ThemeDB.fallback_font
	var y = 105
	for upgrade_key in upgrades.keys():
		if not upgrades[upgrade_key]:
			continue
		var upgrade_def = Constants.UPGRADES.get(upgrade_key, {})
		var upgrade_name = upgrade_def.get("name", upgrade_key.capitalize())
		var color = UPGRADE_COLORS.get(upgrade_key, Color.WHITE)
		draw_string(font, Vector2(Constants.SCREEN_WIDTH - 20, y), "[" + upgrade_name + "]", HORIZONTAL_ALIGNMENT_RIGHT, -1, 14, color)
		y += 18

func draw_state_messages():
	var font = ThemeDB.fallback_font
	match GameManager.state:
		GameManager.GameState.ATTRACT:
			draw_string(font, Constants.SCREEN_CENTER + Vector2(-100, -50), "GYRUSS", HORIZONTAL_ALIGNMENT_LEFT, -1, 48, Color.CYAN)
			draw_string(font, Constants.SCREEN_CENTER + Vector2(-180, 20), "PRESS SPACE TO START", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color.WHITE)
		GameManager.GameState.GAME_OVER:
			draw_string(font, Constants.SCREEN_CENTER + Vector2(-100, 0), "GAME OVER", HORIZONTAL_ALIGNMENT_LEFT, -1, 36, Color.RED)
			draw_string(font, Constants.SCREEN_CENTER + Vector2(-150, 40), "FINAL SCORE: " + str(GameManager.score), HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color.WHITE)
		GameManager.GameState.VICTORY:
			draw_string(font, Constants.SCREEN_CENTER + Vector2(-80, 0), "VICTORY!", HORIZONTAL_ALIGNMENT_LEFT, -1, 36, Color.GREEN)
		GameManager.GameState.BOSS:
			if GameManager.boss_instance != null:
				var hp_ratio = float(GameManager.boss_instance.hp) / max(GameManager.boss_instance.max_hp, 1)
				draw_boss_health_bar(hp_ratio)

func draw_boss_health_bar(ratio: float):
	var bar_width = 400.0
	var bar_height = 12.0
	var origin = Vector2(Constants.SCREEN_CENTER.x - bar_width / 2.0, 110)
	var bg_rect = Rect2(origin, Vector2(bar_width, bar_height))
	var fg_rect = Rect2(origin, Vector2(bar_width * clampf(ratio, 0.0, 1.0), bar_height))
	draw_rect(bg_rect, Color(0.2, 0.0, 0.0, 0.7))
	draw_rect(fg_rect, Color(1.0, 0.2, 0.2, 0.9))
	draw_rect(bg_rect, Color(1.0, 0.4, 0.4), false, 1.5)

func draw_debug_info():
	if not InputHandler.debug_mode:
		return

	var font = ThemeDB.fallback_font
	var lines = [
		"STATE: " + GameManager.GameState.keys()[GameManager.state],
		"ENEMIES: " + str(GameManager.enemies.size()),
		"BULLETS: " + str(GameManager.bullets.size()),
		"PARTICLES: " + str(GameManager.particles.size()),
		"FPS: " + str(Engine.get_frames_per_second())
	]
	var y = Constants.SCREEN_HEIGHT - 120
	for line in lines:
		draw_string(font, Vector2(20, y), line, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1.0, 1.0, 0.0, 0.7))
		y += 18
