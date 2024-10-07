from django.db import models
import string
import random

# a function that generates a unique code with length 6
def generate_unique_code():
    length = 6

    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=length)) #initialize that string code (code='') is a random sequence that must be an ascii uppercase with length 6
        if Room.objects.filter(code=code).count() == 0: #if code is unique break while loop
            break

    return code #return the unique code

# Create your models here.

#a room object with property of "code, host name, guest's ability, votes status, and time of creation"
class Room(models.Model):
    code = models.CharField(max_length=8, default=generate_unique_code, unique=True)
    host = models.CharField(max_length=50, unique=True)
    guest_can_pause = models.BooleanField(null=False, default=False)
    votes_to_skip = models.IntegerField(null=False, default=1)
    created_at = models.DateTimeField(auto_now_add=True)