import time
import math
import numpy as np
import cv2



# --- POLISHED DINO RUN GAME ---
class DinoRunGame:
    def __init__(self, frame_width: int = 640, frame_height: int = 480) -> None:
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.reset()

    def reset(self) -> None:
        self.score = 0
        self.game_over = False

        # Dino parameters (MANDATORY)
        self.dino_width = 60
        self.dino_height = 80
        self.dino_x = 100
        self.ground_y = int(self.frame_height * 0.8)
        self.dino_y = self.ground_y
        self.vel_y = 0.0
        self.gravity = 1.0  # Reduced gravity for slower fall
        self.jump_strength = -20  # Adjusted jump strength
        self.on_ground = True

        # Obstacles
        self.obstacles = []  # list of dicts: {"x", "y", "w", "h"}
        self.min_obstacle_gap = 380
        self.obstacle_speed = 4  # Slower initial speed
        self.last_obstacle_x = -9999

        # Time tracking for scoring
        self._last_update_time = time.time()

    def _maybe_adjust_dimensions(self, frame):
        h, w, _ = frame.shape
        if w != self.frame_width or h != self.frame_height:
            self.frame_width = w
            self.frame_height = h
            self.ground_y = int(self.frame_height * 0.8)

    def _spawn_obstacle(self):
        # Only spawn if last obstacle is far enough
        if not self.obstacles:
            can_spawn = True
        else:
            can_spawn = self.frame_width - self.last_obstacle_x > self.min_obstacle_gap
        if can_spawn:
            obs = {
                "x": self.frame_width + 10,
                "y": self.ground_y,
                "w": 30,
                "h": 50
            }
            self.obstacles.append(obs)
            self.last_obstacle_x = obs["x"]

    def _update_physics(self, jump_trigger: bool, now: float):
        if self.game_over:
            return

        # Difficulty scaling
        self.obstacle_speed = min(4 + self.score // 250, 8)  # Slower max speed

        # Handle jump input
        if jump_trigger and self.on_ground:
            self.vel_y = self.jump_strength
            self.on_ground = False

        # Apply gravity
        self.vel_y += self.gravity
        self.dino_y += int(self.vel_y)

        # Clamp to ground
        if self.dino_y >= self.ground_y:
            self.dino_y = self.ground_y
            self.vel_y = 0.0
            self.on_ground = True

        # Spawn obstacles if needed
        if not self.obstacles or (self.frame_width - self.obstacles[-1]["x"] > self.min_obstacle_gap):
            self._spawn_obstacle()

        # Move obstacles
        for obs in self.obstacles:
            obs["x"] -= self.obstacle_speed
        # Remove obstacles off screen
        self.obstacles = [o for o in self.obstacles if o["x"] + o["w"] > 0]
        if self.obstacles:
            self.last_obstacle_x = self.obstacles[-1]["x"]

        # Increment score over time
        dt = max(0.0, now - self._last_update_time)
        self._last_update_time = now
        self.score += int(dt * 100)

    def _check_collisions(self):
        if self.game_over:
            return
        # Fair collision: shrink hitboxes
        collision_padding = 10
        dx = self.dino_x + collision_padding
        dy = self.dino_y - self.dino_height + collision_padding
        dw = self.dino_width - 2 * collision_padding
        dh = self.dino_height - 2 * collision_padding
        for obs in self.obstacles:
            ox = obs["x"] + collision_padding
            oy = obs["y"] - obs["h"] + collision_padding
            ow = obs["w"] - 2 * collision_padding
            oh = obs["h"] - 2 * collision_padding
            if (
                dx < ox + ow and dx + dw > ox and
                dy < oy + oh and dy + dh > oy
            ):
                self.game_over = True
                break

    def _draw(self, frame):
        # Ground line (visual clarity)
        cv2.line(
            frame,
            (0, self.ground_y + self.dino_height),
            (self.frame_width, self.ground_y + self.dino_height),
            (255, 255, 255),
            2,
        )
        # Dino (rectangle + label)
        x1 = self.dino_x
        y1 = self.dino_y - self.dino_height
        x2 = self.dino_x + self.dino_width
        y2 = self.dino_y
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), -1)
        cv2.putText(frame, "DINO", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        # Obstacles
        for obs in self.obstacles:
            ox1 = int(obs["x"])
            oy1 = int(obs["y"] - obs["h"])
            ox2 = int(obs["x"] + obs["w"])
            oy2 = int(obs["y"])
            cv2.rectangle(frame, (ox1, oy1), (ox2, oy2), (0, 0, 255), -1)
        # HUD
        cv2.putText(
            frame,
            f"Score: {self.score}",
            (10, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (255, 255, 255),
            2,
        )
        if self.game_over:
            cv2.putText(
                frame,
                "GAME OVER",
                (int(self.frame_width * 0.3), int(self.frame_height * 0.4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.2,
                (0, 0, 255),
                3,
            )

    def update(self, frame, jump_trigger: bool, now: float):
        if frame is None:
            return frame
        self._maybe_adjust_dimensions(frame)
        self._update_physics(jump_trigger, now)
        self._check_collisions()
        self._draw(frame)
        return frame

    def get_state(self):
        return {"score": int(self.score), "gameOver": bool(self.game_over)}
