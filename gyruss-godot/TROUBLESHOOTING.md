# Quick Troubleshooting Guide

## First Run Checklist

Before reporting issues, verify:

1. ✓ Using Godot Engine **4.5.1** (not 4.4 or earlier)
2. ✓ Imported `project.godot` from `gyruss-godot-v2/` folder
3. ✓ Project opened successfully (no import errors)
4. ✓ Pressed F5 to run (or clicked Play button)

## Manual Verification Checklist (current build)

Because this project depends on the Godot editor runtime, please run the following smoke tests locally after launching the scene:

1. **Attract → Play transition**: Press `Space` twice (first press arms audio init, second starts the game). Confirm HUD text switches from the attract message to live score/lives and the starfield expands.
2. **Wave spawning**: Wait for at least one standard enemy wave (non-satellite) to enter from off-screen. Use the debug overlay (`T`) to see `ENEMIES` decrement as they are destroyed.
3. **Satellite cycle**: After `WAVES_PER_WARP - 1` normal waves, ensure a satellite trio spawns, awards score when destroyed, and only then triggers the warp countdown.
4. **Warp completion**: Let the warp animation finish (≈2.8s) and confirm `warps_to_planet` decrements while the HUD planet name stays in sync.
5. **Boss jump sanity**: Press `B` to jump directly to a boss. Verify old bullets/missiles are cleared, the boss HP bar appears at the top center, and the fight progresses.
6. **Restart flow**: Press `R` during gameplay to ensure the project resets to a fresh PLAYING state with lives/missiles restored.

Document any failures in this file under a new dated heading so regressions are easy to spot.

## Common Error Patterns

### Error: "Parse Error: Identifier not declared in current scope"

**Symptoms**: Script won't load, mentions missing variable/function
**Cause**: Missing autoload or incorrect reference
**Solution**: 
1. Check Project → Project Settings → Autoload
2. Verify all 4 autoloads are present:
   - Constants (scripts/autoload/constants.gd)
   - GameManager (scripts/autoload/game_manager.gd)
   - InputHandler (scripts/autoload/input_handler.gd)
   - AudioManager (scripts/autoload/audio_manager.gd)

### Error: "Invalid get index 'X' (on base: 'Nil')"

**Symptoms**: Runtime error, something is null
**Cause**: Entity not properly created
**Common Locations**:
- `GameManager.player.angle` → Player not created
- `GameManager.stars[i].radius` → Starfield not initialized

**Solution**:
1. Check GameManager._ready() was called
2. Verify start_attract_mode() ran
3. Check init_starfield() populated stars array

### Error: "Invalid call. Nonexistent function 'update'"

**Symptoms**: Can't call update() on entity
**Cause**: Player/enemy is Dictionary instead of class instance
**Solution**: Check entity class instantiation in game_manager.gd

### Blank Screen (No Errors)

**Possible Causes**:
1. MainRenderer not in scene tree
2. _draw() not being called
3. Game state stuck in ATTRACT with no UI rendering

**Debug Steps**:
```
1. Open scenes/main.tscn
2. Verify "MainRenderer" node exists under Main
3. Check MainRenderer has script attached
4. Add print statement to main_renderer.gd → _draw()
5. Run game and check Output panel
```

### Starfield Not Moving

**Symptoms**: Stars visible but static
**Debug**:
```gdscript
# Add to main_renderer.gd → update_starfield():
print("Updating ", GameManager.stars.size(), " stars")
print("Warp factor: ", warp_factor)
```

**Expected Output**: Should print every frame with 350 stars

### No Enemies Spawning

**Symptoms**: Game starts but no enemies appear
**Debug**:
```gdscript
# Add to game_manager.gd → update_playing():
print("Spawn timer: ", spawn_timer, " Enemies: ", enemies.size())
```

**Expected**: Timer counts down, enemies appear when timer reaches 0

## Debug Mode Testing

Press **T** key to toggle invulnerability + debug HUD. Bottom-left corner should show:
```
STATE: PLAYING
ENEMIES: X
BULLETS: X
PARTICLES: X
FPS: 60
```

If not visible:
- Check InputHandler received T keypress
- Check main_renderer.gd → draw_ui() calls ui_renderer.draw_debug_info()

## Performance Issues

**Symptoms**: FPS drops below 30
**Causes**:
1. Too many particles (>1000)
2. Complex boss rendering
3. Inefficient collision detection

**Quick Fix**:
```gdscript
# In constants.gd, reduce multipliers:
func get_starfield_multiplier() -> float:
    return 0.5  # Was 1.0

func get_particle_multiplier() -> float:
    return 0.5  # Was 1.0
```

## Input Not Working

**Symptoms**: Can't rotate player or fire
**Checks**:
1. Click game window to focus it
2. Verify InputHandler autoload is active
3. Check Project → Project Settings → Input Map (should be empty, we use raw input)

**Debug**:
```gdscript
# Add to input_handler.gd → _input():
print("Input: ", event)
```

Should print every keypress/click.

## Scene Hierarchy Issues

**Expected Structure** (in main.tscn):
```
Main (Node2D)
└── MainRenderer (Node2D)
    Script: res://scripts/rendering/main_renderer.gd
```

**Check**:
1. Open scenes/main.tscn
2. Verify node names match exactly
3. Verify MainRenderer has script attached
4. Verify Main is root node

## Script Loading Errors

**Error: "Can't preload resource at path"**
**Solution**: 
1. Check file paths are exactly: `res://scripts/...`
2. Verify all .gd files are in correct folders
3. Check for typos in load() statements

**Common Typos**:
- `scripts/entity/player.gd` → Should be `scripts/entities/player.gd` (plural!)
- `script/autoload/...` → Should be `scripts/autoload/...` (plural!)

## Boss Not Appearing

**Symptoms**: Boss stage triggers but no boss visible
**Debug**:
```gdscript
# Add to game_manager.gd → update_boss():
print("Boss state: ", current_boss)
```

**Should Show**:
```
Boss state: { type: 0, hp: 200, max_hp: 200, is_dead: false, is_destroying: false }
```

## Weapon System Issues

**Symptoms**: Can fire but bullets don't damage enemies
**Checks**:
1. Bullets array is populated (debug UI shows BULLETS: X)
2. BulletEntity.update_player_bullets() is called
3. Collision detection runs

**Debug**:
```gdscript
# Add to bullet.gd → check_enemy_collision():
print("Bullet at ", bullet_pos, " checking ", GameManager.enemies.size(), " enemies")
```

## Audio Not Playing

**Expected**: This is NORMAL! Audio is placeholder.
**Current Behavior**: Prints "SFX: [sound name]" to Output panel.
**Not a Bug**: Full audio implementation requires AudioStreamGenerator.

## Debug Shortcuts / QA Helpers

These inputs are wired directly in `GameManager.handle_global_shortcuts()` for faster iteration:

- `R`: Restart the run immediately (resets waves, starfield, player lives, score).
- `T`: Toggle player invulnerability and show/hide the HUD debug overlay.
- `W`: Force a warp event (resets satellite counters, keeps weapons).
- `B`: Jump straight to the next boss in the rotation (clears active entities, spawns boss, displays HP bar).

Whenever one of these is used, `InputHandler.clear_debug_keys()` runs automatically; no need to tap keys twice. If a shortcut stops working, add a `print()` in `GameManager.handle_global_shortcuts()` to confirm the flag is being read.

## Rendering Issues

### Problem: Everything renders but looks wrong

**Symptoms**: Enemies at wrong positions, starfield direction wrong
**Cause**: Fundamental architecture issue (unlikely if using gyruss-godot-v2)

**Verify**:
1. Starfield spawns at center: `radius: Constants.rand_range(1.0, 40.0)`
2. Stars move outward: `star.radius += star.speed * delta`
3. Enemies spawn off-screen: `radius: -20.0` to `-120.0`
4. Enemies move inward: `enemy.radius += enemy.enter_speed * delta`

### Problem: Missing UI elements

**Symptoms**: No score, lives, or planet display
**Check**: 
1. main_renderer.gd → _draw() calls draw_ui()
2. draw_ui() uses ThemeDB.fallback_font
3. Text color isn't black on black

## Still Having Issues?

### Gather This Information:

1. **Godot Version**: (Check Help → About Godot)
2. **Error Messages**: (Copy from Output panel)
3. **Console Output**: (All print statements)
4. **Scene Structure**: (Screenshot of scene tree)
5. **Behavior**: (What happens vs what should happen)

### Then Report:

"Game [runs/crashes/blank screen]. Error: [paste error]. Expected: [describe]. Actual: [describe]."

## Emergency Reset

If project is completely broken:

```
1. Close Godot
2. Delete .godot/ folder in project directory
3. Reopen project in Godot
4. Wait for reimport
5. Run again
```

This forces Godot to recreate all cached data.

## Success Indicators

✅ **Working Correctly** if you see:
- Starfield expanding outward from center
- Player ship rotating on orbit ring
- Enemies entering from off-screen edge
- HUD showing score/lives/planet/warps
- Bullets moving inward from player
- Explosions creating particles
- "3 WARPS TO [PLANET]" decrements properly

🎮 **Ready to Play** when all above work!
