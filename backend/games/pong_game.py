import cv2
import numpy as np
import random
import time

class PongGame:
    """Single-player Pong game - User vs AI (Alone Forever Pong)"""
    
    def __init__(self, frame_width=640, frame_height=480):
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.reset()
    
    def reset(self):
        """Initialize/reset game state"""
        self.score = 0
        self.game_over = False
        
        # Paddle dimensions
        self.paddle_width = 15
        self.paddle_height = 100
        self.paddle_speed = 8
        
        # Player paddle (LEFT side - controlled by hand)
        self.player_paddle_x = 30
        self.player_paddle_y = self.frame_height // 2 - self.paddle_height // 2
        
        # AI paddle (RIGHT side - controlled by AI)
        self.ai_paddle_x = self.frame_width - 30 - self.paddle_width
        self.ai_paddle_y = self.frame_height // 2 - self.paddle_height // 2
        
        # Ball properties
        self.ball_size = 12
        self.ball_x = self.frame_width // 2
        self.ball_y = self.frame_height // 2
        self.ball_speed_x = 6
        self.ball_speed_y = random.choice([-4, -3, 3, 4])
        self.ball_base_speed = 6
        
        # AI settings (make it beatable)
        self.ai_reaction_delay = 0.05  # Seconds
        self.ai_max_speed = 6  # Slower than ball for fairness
        self.last_ai_update = time.time()
        
    def _adjust_dimensions(self, frame):
        """Adjust game dimensions to match frame size"""
        h, w, _ = frame.shape
        if w != self.frame_width or h != self.frame_height:
            # Proportionally adjust positions
            x_ratio = w / self.frame_width
            y_ratio = h / self.frame_height
            
            self.player_paddle_y = int(self.player_paddle_y * y_ratio)
            self.ai_paddle_y = int(self.ai_paddle_y * y_ratio)
            self.ball_x = int(self.ball_x * x_ratio)
            self.ball_y = int(self.ball_y * y_ratio)
            
            self.frame_width = w
            self.frame_height = h
            
            # Reposition paddles
            self.player_paddle_x = 30
            self.ai_paddle_x = self.frame_width - 30 - self.paddle_width
    
    def update_player_paddle(self, hand_y_normalized):
        """Update player paddle position based on hand Y position
        
        Args:
            hand_y_normalized: Hand Y position normalized to 0-1 range
        """
        if hand_y_normalized is not None and 0 <= hand_y_normalized <= 1:
            # Map hand position to paddle position
            target_y = int(hand_y_normalized * self.frame_height)
            
            # Center paddle on hand position
            self.player_paddle_y = target_y - self.paddle_height // 2
            
            # Keep paddle within bounds
            self.player_paddle_y = max(0, min(self.player_paddle_y, 
                                              self.frame_height - self.paddle_height))
    
    def _update_ai_paddle(self):
        """AI paddle follows ball with reaction delay"""
        current_time = time.time()
        
        # Only update AI position with delay (simulates human reaction time)
        if current_time - self.last_ai_update > self.ai_reaction_delay:
            ball_center_y = self.ball_y
            ai_paddle_center_y = self.ai_paddle_y + self.paddle_height // 2
            
            # Move AI paddle towards ball
            if ball_center_y < ai_paddle_center_y - 10:
                self.ai_paddle_y -= self.ai_max_speed
            elif ball_center_y > ai_paddle_center_y + 10:
                self.ai_paddle_y += self.ai_max_speed
            
            # Keep AI paddle within bounds
            self.ai_paddle_y = max(0, min(self.ai_paddle_y, 
                                         self.frame_height - self.paddle_height))
            
            self.last_ai_update = current_time
    
    def _update_ball(self):
        """Update ball position and handle collisions"""
        if self.game_over:
            return
        
        # Move ball
        self.ball_x += self.ball_speed_x
        self.ball_y += self.ball_speed_y
        
        # Bounce off top and bottom walls
        if self.ball_y <= self.ball_size // 2 or self.ball_y >= self.frame_height - self.ball_size // 2:
            self.ball_speed_y *= -1
            self.ball_y = max(self.ball_size // 2, min(self.ball_y, 
                                                        self.frame_height - self.ball_size // 2))
        
        # Check collision with PLAYER paddle (LEFT)
        if (self.ball_x - self.ball_size // 2 <= self.player_paddle_x + self.paddle_width and
            self.ball_x + self.ball_size // 2 >= self.player_paddle_x and
            self.ball_y >= self.player_paddle_y and
            self.ball_y <= self.player_paddle_y + self.paddle_height):
            
            # Ball hit player paddle - reverse direction and increase score
            self.ball_speed_x = abs(self.ball_speed_x)
            self.score += 1
            
            # Gradually increase difficulty
            if self.score % 3 == 0:
                self.ball_speed_x += 0.5
                self.ball_base_speed += 0.5
            
            # Add angle based on where ball hits paddle
            hit_pos = (self.ball_y - self.player_paddle_y) / self.paddle_height
            self.ball_speed_y = (hit_pos - 0.5) * 10
        
        # Check collision with AI paddle (RIGHT)
        if (self.ball_x + self.ball_size // 2 >= self.ai_paddle_x and
            self.ball_x - self.ball_size // 2 <= self.ai_paddle_x + self.paddle_width and
            self.ball_y >= self.ai_paddle_y and
            self.ball_y <= self.ai_paddle_y + self.paddle_height):
            
            # Ball hit AI paddle - reverse direction
            self.ball_speed_x = -abs(self.ball_speed_x)
            
            # Add angle based on where ball hits paddle
            hit_pos = (self.ball_y - self.ai_paddle_y) / self.paddle_height
            self.ball_speed_y = (hit_pos - 0.5) * 10
        
        # Check if ball went past PLAYER paddle (LEFT boundary - Game Over)
        if self.ball_x < 0:
            self.game_over = True
        
        # If ball went past AI paddle (RIGHT boundary - just bounce back)
        if self.ball_x > self.frame_width:
            self.ball_x = self.frame_width - 5
            self.ball_speed_x = -abs(self.ball_speed_x)
    
    def _draw(self, frame):
        """Draw game elements on frame"""
        # Draw center line (dashed)
        for y in range(0, self.frame_height, 20):
            cv2.line(frame, 
                    (self.frame_width // 2, y), 
                    (self.frame_width // 2, y + 10),
                    (100, 100, 100), 2)
        
        # Draw player paddle (LEFT - green)
        cv2.rectangle(frame,
                     (self.player_paddle_x, self.player_paddle_y),
                     (self.player_paddle_x + self.paddle_width, 
                      self.player_paddle_y + self.paddle_height),
                     (0, 255, 0), -1)
        
        # Draw AI paddle (RIGHT - red)
        cv2.rectangle(frame,
                     (self.ai_paddle_x, self.ai_paddle_y),
                     (self.ai_paddle_x + self.paddle_width, 
                      self.ai_paddle_y + self.paddle_height),
                     (0, 0, 255), -1)
        
        # Draw ball (blue)
        cv2.circle(frame,
                  (int(self.ball_x), int(self.ball_y)),
                  self.ball_size // 2,
                  (255, 0, 0), -1)
        
        # Draw score (top center)
        score_text = f"Score: {self.score}"
        cv2.putText(frame, score_text,
                   (self.frame_width // 2 - 60, 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # Draw game over message
        if self.game_over:
            # Semi-transparent overlay
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (self.frame_width, self.frame_height),
                         (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
            
            # Game over text
            cv2.putText(frame, "GAME OVER",
                       (self.frame_width // 2 - 150, self.frame_height // 2 - 40),
                       cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 4)
            
            cv2.putText(frame, f"Final Score: {self.score}",
                       (self.frame_width // 2 - 120, self.frame_height // 2 + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
    
    def update(self, frame, hand_y_normalized):
        """Main game update loop
        
        Args:
            frame: Video frame to draw on
            hand_y_normalized: Hand Y position (0-1 range), or None if no hand detected
        
        Returns:
            Updated frame with game rendered
        """
        if frame is None:
            return frame
        
        # Adjust dimensions if needed
        self._adjust_dimensions(frame)
        
        if not self.game_over:
            # Update player paddle based on hand position
            self.update_player_paddle(hand_y_normalized)
            
            # Update AI paddle
            self._update_ai_paddle()
            
            # Update ball physics
            self._update_ball()
        
        # Draw everything
        self._draw(frame)
        
        return frame
    
    def get_state(self):
        """Get current game state for API"""
        return {
            "score": self.score,
            "gameOver": self.game_over
        }
