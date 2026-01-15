import random
import time
from typing import List, Tuple, Optional

import cv2
import numpy as np


class Fruit:
    def __init__(self, position: Tuple[int, int], velocity: Tuple[int, int], color: Tuple[int, int, int], size: int):
        self.position = list(position)  # [x, y]
        self.velocity = list(velocity)  # [vx, vy]
        self.color = color
        self.size = size

    def move(self):
        self.position[0] += self.velocity[0]
        self.position[1] += self.velocity[1]

    @property
    def center(self) -> Tuple[int, int]:
        return int(self.position[0]), int(self.position[1])


class FruitNinjaGame:
    """Server-side Fruit Ninja engine that draws directly on frames.

    The logic follows the specified standalone mechanics:
    - speed, spawn_rate, score, lives, difficulty_level
    - fruit spawning and movement
    - slice detection using index fingertip distance < Fruit_Size
    - difficulty scaling at every 1000 score
    - lives and game over handling
    """

    def __init__(self):
        # Original base values
        self.base_speed = [0, 5]
        self.base_spawn_rate = 1.0
        self.base_lives = 15
        self.base_difficulty = 1
        self.fruit_size = 30

        # Dynamic state
        self.fruits: List[Fruit] = []
        self.score: int = 0
        self.lives: int = self.base_lives
        self.difficulty_level: int = self.base_difficulty
        self.spawn_rate: float = self.base_spawn_rate
        self.speed: List[int] = self.base_speed.copy()  # [vx, vy]
        self.game_over: bool = False

        # Slash trail (list of (x, y))
        self.slash_points: List[Tuple[int, int]] = []
        self.slash_length: int = 19
        self.slash_color: Tuple[int, int, int] = (0, 255, 0)

        # Timing
        self.next_spawn_time: float = time.time() + 1.0
        self.last_time: float = time.time()

    # --- Public API ---
    def reset(self):
        self.fruits.clear()
        self.score = 0
        self.lives = self.base_lives
        self.difficulty_level = self.base_difficulty
        self.spawn_rate = self.base_spawn_rate
        self.speed = self.base_speed.copy()
        self.game_over = False
        self.slash_points.clear()
        self.slash_color = (0, 255, 0)
        self.next_spawn_time = time.time() + 1.0
        self.last_time = time.time()

    def update(self, frame: np.ndarray, index_pos: Optional[Tuple[int, int]], now: float) -> np.ndarray:
        """Update game state and draw current frame overlays.

        :param frame: BGR OpenCV frame
        :param index_pos: (x, y) fingertip position in pixels or None
        :param now: current time.time()
        :return: modified frame
        """
        if frame is None:
            return frame

        h, w = frame.shape[:2]

        # Spawn fruits according to spawn_rate and now
        self._maybe_spawn_fruits(w, h, now)

        # Move fruits and handle off-screen (lives decrement)
        self._move_fruits(frame, h, w)

        # Handle slicing using current index fingertip position
        self._update_slash_and_collisions(index_pos)

        # Draw slash trail
        self._draw_slash(frame)

        # Draw score, lives, difficulty, optional FPS
        self._draw_hud(frame, now)

        # Game over overlay
        if self.game_over:
            self._draw_game_over(frame)

        return frame

    # --- State helpers ---
    def _maybe_spawn_fruits(self, frame_w: int, frame_h: int, now: float):
        if self.game_over:
            return

        # spawn_rate: fruits per second; we use simple next_spawn_time scheduling
        if now >= self.next_spawn_time:
            # spawn at least 1 fruit; could extend to multiple fruits per spawn
            self.spawn_fruit(frame_w, frame_h)
            # Next spawn based on spawn_rate (avoid division by zero)
            rate = max(self.spawn_rate, 0.1)
            self.next_spawn_time = now + 1.0 / rate

    def spawn_fruit(self, frame_w: int, frame_h: int):
        # Fruits originate near the bottom with upward velocity, moving diagonally
        x = random.randint(50, max(100, frame_w - 50))
        y = frame_h + self.fruit_size  # start just below the bottom

        # Horizontal speed based on current speed[0]
        vx = self.speed[0]
        # Vertical speed is negative to go up
        vy = -self.speed[1]

        # Randomize horizontal direction a bit if vx is 0
        if vx == 0:
            vx = random.choice([-3, -2, -1, 1, 2, 3])

        color = (
            random.randint(50, 255),
            random.randint(50, 255),
            random.randint(50, 255),
        )

        fruit = Fruit((x, y), (vx, vy), color, self.fruit_size)
        self.fruits.append(fruit)

    def _move_fruits(self, frame: np.ndarray, frame_h: int, frame_w: int):
        if self.game_over:
            # Still draw existing fruits without updating lives
            for fruit in self.fruits:
                cv2.circle(frame, fruit.center, fruit.size, fruit.color, -1)
            return

        remaining_fruits: List[Fruit] = []

        for fruit in self.fruits:
            fruit.move()
            cx, cy = fruit.center

            # Draw fruit
            cv2.circle(frame, (cx, cy), fruit.size, fruit.color, -1)

            # Check if fruit left the screen (top or right side)
            if cy < 20 or cx > frame_w + fruit.size:
                # Fruit missed: decrement lives
                self.lives -= 1
                if self.lives <= 0:
                    self.game_over = True
                # Do not keep this fruit
                continue

            # Otherwise keep fruit
            remaining_fruits.append(fruit)

        # Replace list with remaining fruits
        self.fruits = remaining_fruits

        # If game over, clear remaining fruits as per spec
        if self.game_over:
            self.fruits.clear()

    def _update_slash_and_collisions(self, index_pos: Optional[Tuple[int, int]]):
        # Update slash trail
        if index_pos is not None and not self.game_over:
            self.slash_points.append(index_pos)
            if len(self.slash_points) > self.slash_length:
                self.slash_points = self.slash_points[-self.slash_length :]
        else:
            # Slowly fade slash when no hand
            if self.slash_points:
                self.slash_points = self.slash_points[1:]

        if self.game_over or index_pos is None:
            return

        ix, iy = index_pos
        remaining_fruits: List[Fruit] = []

        for fruit in self.fruits:
            fx, fy = fruit.center
            if self._distance((ix, iy), (fx, fy)) < self.fruit_size:
                # Slice: increase score, set slash color, and do not keep fruit
                self.score += 100
                self.slash_color = fruit.color
                # Update difficulty scaling
                self._update_difficulty()
            else:
                remaining_fruits.append(fruit)

        self.fruits = remaining_fruits

    def _update_difficulty(self):
        if self.score != 0 and self.score % 1000 == 0:
            self.difficulty_level = int((self.score / 1000) + 1)
            self.spawn_rate = self.difficulty_level * 4.0 / 5.0

            # Scale speeds
            # Horizontal speed: only scale if non-zero
            if self.speed[0] != 0:
                self.speed[0] = int(self.speed[0] * self.difficulty_level)

            # Vertical component
            self.speed[1] = int(5 * self.difficulty_level / 2)

    def _draw_slash(self, frame: np.ndarray):
        if len(self.slash_points) < 2:
            return
        pts = np.array(self.slash_points, dtype=np.int32).reshape((-1, 1, 2))
        cv2.polylines(frame, [pts], False, self.slash_color, 4)

    def _draw_hud(self, frame: np.ndarray, now: float):
        h, w = frame.shape[:2]
        # Basic FPS estimation
        dt = max(now - self.last_time, 1e-3)
        fps = 1.0 / dt
        self.last_time = now

        # Background rectangle
        cv2.rectangle(frame, (10, 10), (300, 100), (0, 0, 0), cv2.FILLED)

        cv2.putText(frame, f"Score: {self.score}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, f"Lives: {self.lives}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        cv2.putText(frame, f"Level: {self.difficulty_level}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)

        # FPS in top-right corner
        cv2.putText(frame, f"FPS: {fps:.1f}", (w - 140, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    def _draw_game_over(self, frame: np.ndarray):
        h, w = frame.shape[:2]
        text = "GAME OVER"
        subtext = "Press Reset to play again"
        size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 3)
        text_w, text_h = size
        x = (w - text_w) // 2
        y = h // 2

        cv2.rectangle(frame, (x - 30, y - text_h - 40), (x + text_w + 30, y + 40), (0, 0, 0), cv2.FILLED)
        cv2.putText(frame, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
        cv2.putText(frame, subtext, (x - 40, y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    @staticmethod
    def _distance(a: Tuple[int, int], b: Tuple[int, int]) -> float:
        ax, ay = a
        bx, by = b
        return float(((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5)

    def get_state(self):
        return {
            "score": int(self.score),
            "lives": int(self.lives),
            "level": int(self.difficulty_level),
            "gameOver": bool(self.game_over),
        }
