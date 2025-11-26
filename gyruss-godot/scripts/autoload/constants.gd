extends Node
# Global game constants - matches JavaScript game exactly
# Based on working src/game.js implementation

# Screen dimensions (900x900 SQUARE, not portrait!)
const SCREEN_WIDTH = 900
const SCREEN_HEIGHT = 900
const SCREEN_CENTER = Vector2(450.0, 450.0)
const TWO_PI = TAU

# Player orbit configuration (matches JS exactly)
const PLAYER_ORBIT_RADIUS = 378.0  # JS: 378
const PLAYER_ROTATION_SPEED = 3.2  # radians per second
const PLAYER_SIZE = 20

# Game progression
const STARTING_LIVES = 5
const STARTING_MISSILES = 3
const INVULNERABILITY_DURATION = 2.5

# Weapon configurations (matches JS WEAPONS object)
const WEAPONS = {
	"Laser": {
		"id": "laser",
		"name": "Laser",
		"speed": 600.0,
		"damage": 1,
		"cooldown": 0.12,
		"color": Color("#ffd966"),
		"size": 3.0
	},
	"Plasma": {
		"id": "plasma",
		"name": "Plasma",
		"speed": 500.0,
		"damage": 2,
		"cooldown": 0.2,
		"color": Color("#66ffcc"),
		"size": 5.0
	},
	"Wave": {
		"id": "wave",
		"name": "Wave",
		"speed": 550.0,
		"damage": 1,
		"cooldown": 0.15,
		"color": Color("#ff66aa"),
		"size": 4.0,
		"spread_angle": 0.2
	}
}

# Upgrade configurations
const UPGRADES = {
	"Shield": {
		"id": "shield",
		"duration": 10.0,
		"color": Color("#66aaff")
	},
	"Rapid Fire": {
		"id": "rapid_fire",
		"duration": 15.0,
		"multiplier": 2.0
	},
	"Triple Shot": {
		"id": "triple_shot",
		"duration": 20.0
	}
}

# Enemy configurations
const ENEMY_COLORS = ["#24d8ff", "#ff6ae6", "#ffe066", "#ff9376", "#9d7bff"]
const ENEMY_BASE_SPEED = 150.0
const ENEMY_FIRE_PROBABILITY = 0.003

# Enemy sizes and stats
const ENEMY_FIGHTER_SIZE = 12.0
const ENEMY_FIGHTER_HP = 1
const ENEMY_FIGHTER_SCORE = 100

const ENEMY_SAUCER_SIZE = 16.0
const ENEMY_SAUCER_HP = 2
const ENEMY_SAUCER_SCORE = 150

const ENEMY_BOMBER_SIZE = 20.0
const ENEMY_BOMBER_HP = 3
const ENEMY_BOMBER_SCORE = 200

const SATELLITE_SCORE = 50
const SATELLITE_LIFETIME = 6.0

# Boss configurations
const BOSS_SERPENT_HP = 50
const BOSS_SERPENT_SEGMENTS = 10
const BOSS_SERPENT_DESTRUCTION_TIME = 4.0

const BOSS_DESTROYER_HP = 80
const BOSS_DESTROYER_TURRETS = 8
const BOSS_DESTROYER_DESTRUCTION_TIME = 5.0

const BOSS_CORE_HP = 100
const BOSS_CORE_ORBITALS = 6
const BOSS_CORE_DESTRUCTION_TIME = 6.0

# Wave system
const WAVES_PER_WARP = 3
const SATELLITE_WAVES_PER_WARP = 3
const WAVE_DELAY_MIN = 0.85
const WAVE_DELAY_MAX = 2.0

# Planet progression (matches JS exactly)
const PLANETS = [
	"Neptune",
	"Uranus", 
	"Saturn",
	"Jupiter",
	"Mars",
	"Earth",
	"THE CORE"
]

# Particle system
const MAX_PARTICLES = 200
const PARTICLE_LIFETIME_MIN = 0.4
const PARTICLE_LIFETIME_MAX = 0.8
const PARTICLE_FRICTION = 0.98

# Visual effects - Starfield
const STARFIELD_STAR_COUNT = 350
const STARFIELD_SPAWN_RADIUS_MIN = 1.0
const STARFIELD_SPAWN_RADIUS_MAX = 40.0

# Quality levels
enum QualityLevel { LOW, MEDIUM, HIGH }
var current_quality = QualityLevel.HIGH

func get_particle_multiplier() -> float:
	match current_quality:
		QualityLevel.LOW: return 0.5
		QualityLevel.MEDIUM: return 0.75
		QualityLevel.HIGH: return 1.0
		_: return 0.75

func get_starfield_multiplier() -> float:
	match current_quality:
		QualityLevel.LOW: return 0.5
		QualityLevel.MEDIUM: return 0.75
		QualityLevel.HIGH: return 1.0
		_: return 0.75

# Utility functions (matches JS Gyruss.Utils)
func polar_to_cartesian(angle: float, radius: float) -> Vector2:
	return Vector2(
		SCREEN_CENTER.x + cos(angle) * radius,
		SCREEN_CENTER.y + sin(angle) * radius
	)

func cartesian_to_polar(pos: Vector2) -> Vector2:
	var dx = pos.x - SCREEN_CENTER.x
	var dy = pos.y - SCREEN_CENTER.y
	var angle = atan2(dy, dx)
	var radius = sqrt(dx * dx + dy * dy)
	return Vector2(angle, radius)

func wrap_angle(angle: float) -> float:
	var result = fmod(angle, TWO_PI)
	if result < 0:
		result += TWO_PI
	return result

func rand_range(min_val: float, max_val: float) -> float:
	return randf() * (max_val - min_val) + min_val

func dist_sq(x1: float, y1: float, x2: float, y2: float) -> float:
	return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)

func dist_sq_vec(a: Vector2, b: Vector2) -> float:
	return a.distance_squared_to(b)
