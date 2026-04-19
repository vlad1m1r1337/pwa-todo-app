from django.db import models


class Todo(models.Model):
    text = models.TextField()
    is_completed = models.BooleanField(default=False)
    def __str__(self) -> str:
        return self.text[:50]
