import cv2
import numpy as np
import random
from typing import Optional, Tuple


class SnakeGame:
    """Server-side snake game drawn on OpenCV frames.

    The snake head follows a provided (x, y) pixel coordinate (index fingertip).
    State (points, score, food) is independent of the camera; we only draw
    overlays on the incoming frame passed to update().
    """

    def __init__(self, food_image_path: Optional[str] = None):
        # Snake body points (head is last)
        self.points = []  # type: list[Tuple[int, int]]
        self.lengths = []  # type: list[float]
        self.current_length = 0.0
        self.allowed_length = 200.0
        self.previous_head: Optional[Tuple[int, int]] = None

        # Food
        self.food_point: Tuple[int, int] = (0, 0)
        self.food_size = 40
        self.food_image = None

        # Game state
        self.score = 0
        self.game_over = False

        # Load food image if provided
        if food_image_path:
            try:
                img = cv2.imread(food_image_path, cv2.IMREAD_UNCHANGED)
                if img is not None and img.size > 0:
                    self.food_image = img
            except Exception:
                self.food_image = None

    # --- Public API ---
    def reset(self):
        self.points.clear()
        self.lengths.clear()
        self.current_length = 0.0
        self.allowed_length = 200.0
        self.previous_head = None
        self.score = 0
        self.game_over = False
        # food_point will be re-randomized on next update when we know frame size

    def get_state(self):
        return {"score": int(self.score), "gameOver": bool(self.game_over)}

    def update(self, frame: np.ndarray, head_pos: Optional[Tuple[int, int]]):
        """Update snake state from current head_pos and draw on frame.

        head_pos: (x, y) pixel coordinates of index fingertip in the same
        coordinate space as the frame. If None, we only draw current state.
        """
        if frame is None:
            return frame

        h, w, _ = frame.shape

        # Initialize food if needed
        if self.food_point == (0, 0):
            self._randomize_food(w, h)

        if self.game_over:
            # Just draw existing snake/food and game over text
            self._draw_snake(frame)
            self._draw_food(frame)
            self._draw_hud(frame)
            self._draw_game_over(frame)
            return frame

        if head_pos is not None:
            x, y = head_pos
            # Clamp to frame bounds
            x = max(0, min(w - 1, x))
            y = max(0, min(h - 1, y))
            current_head = (x, y)

            if self.previous_head is None:
                self.previous_head = current_head
                self.points = [current_head]
                self.lengths = []
                self.current_length = 0.0
            else:
                px, py = self.previous_head
                dx, dy = x - px, y - py
                segment_length = (dx ** 2 + dy ** 2) ** 0.5

                if segment_length > 1.0:
                    self.points.append(current_head)
                    self.lengths.append(segment_length)
                    self.current_length += segment_length
                    self.previous_head = current_head

                    # Trim tail to maintain allowed length
                    while self.lengths and self.current_length > self.allowed_length:
                        self.current_length -= self.lengths[0]
                        self.lengths.pop(0)
                        self.points.pop(0)

                    # Self-collision detection (ignore last few points near head)
                    if len(self.points) > 10:
                        head_x, head_y = current_head
                        # Check distance to body points except the last 10
                        for pt in self.points[:-10]:
                            bx, by = pt
                            dist = ((head_x - bx) ** 2 + (head_y - by) ** 2) ** 0.5
                            if dist < 10:
                                self.game_over = True
                                break

                    # Food collision
                    fx, fy = self.food_point
                    food_dist = ((x - fx) ** 2 + (y - fy) ** 2) ** 0.5
                    if food_dist < self.food_size:
                        self.score += 1
                        self.allowed_length += 40
                        self._randomize_food(w, h)
        else:
            # No hand; we just draw current snake/food without updating
            pass

        # Draw game elements
        self._draw_snake(frame)
        self._draw_food(frame)
        self._draw_hud(frame)

        return frame

    # --- Internal helpers ---
    def _randomize_food(self, frame_w: int, frame_h: int):
        margin = 60
        x_min, x_max = margin, max(margin + 1, frame_w - margin)
        y_min, y_max = margin, max(margin + 1, frame_h - margin)
        self.food_point = (
            random.randint(x_min, x_max - 1),
            random.randint(y_min, y_max - 1),
        )

    def _draw_snake(self, frame: np.ndarray):
        if len(self.points) < 2:
            if self.points:
                cv2.circle(frame, self.points[-1], 8, (0, 255, 0), cv2.FILLED)
            return

        # Draw body
        for i in range(1, len(self.points)):
            cv2.line(frame, self.points[i - 1], self.points[i], (0, 255, 0), 10)

        # Draw head
        head = self.points[-1]
        cv2.circle(frame, head, 12, (0, 0, 255), cv2.FILLED)

    def _draw_food(self, frame: np.ndarray):
        x, y = self.food_point
        size = self.food_size

        if self.food_image is not None and self.food_image.shape[2] == 4:
            fh, fw, _ = self.food_image.shape
            scale = size * 2 / max(fw, fh)
            new_w = int(fw * scale)
            new_h = int(fh * scale)
            food_resized = cv2.resize(self.food_image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            fx = max(0, x - new_w // 2)
            fy = max(0, y - new_h // 2)
            fh, fw, _ = food_resized.shape
            h, w, _ = frame.shape
            if fx + fw > w:
                fx = max(0, w - fw)
            if fy + fh > h:
                fy = max(0, h - fh)

            roi = frame[fy:fy + fh, fx:fx + fw]
            alpha = food_resized[:, :, 3] / 255.0
            alpha = alpha[:, :, np.newaxis]
            rgb_food = food_resized[:, :, :3]
            roi[:] = (alpha * rgb_food + (1 - alpha) * roi).astype(np.uint8)
        else:
            # Fallback: draw a simple circle
            cv2.circle(frame, (x, y), size, (255, 255, 0), cv2.FILLED)

    def _draw_hud(self, frame: np.ndarray):
        cv2.rectangle(frame, (10, 10), (230, 60), (0, 0, 0), cv2.FILLED)
        cv2.putText(
            frame,
            f"Score: {self.score}",
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )

    def _draw_game_over(self, frame: np.ndarray):
        h, w, _ = frame.shape
        text = "Game Over - Raise hand & Reset"
        size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
        text_w, text_h = size
        x = (w - text_w) // 2
        y = h // 2
        cv2.rectangle(
            frame,
            (x - 20, y - text_h - 20),
            (x + text_w + 20, y + 20),
            (0, 0, 0),
            cv2.FILLED,
        )
        cv2.putText(
            frame,
            text,
            (x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
