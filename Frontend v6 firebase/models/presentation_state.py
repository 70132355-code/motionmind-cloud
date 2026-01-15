class PresentationState:
    def __init__(self, current_slide=1, is_running=False, last_gesture_timestamp=0, debounce_duration=400):
        self.current_slide = current_slide
        self.is_running = is_running
        self.last_gesture_timestamp = last_gesture_timestamp
        self.debounce_duration = debounce_duration
