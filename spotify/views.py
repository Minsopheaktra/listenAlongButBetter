from django.shortcuts import render, redirect
from .credentials import REDIRECT_URI, CLIENT_SECRET, CLIENT_ID
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from requests import Request, post
from .util import *
from api.models import Room
import logging

logger = logging.getLogger(__name__)


class AuthURL(APIView):
    def get(self, request, format=None):
        scopes = "user-read-playback-state user-modify-playback-state user-read-currently-playing"

        url = (
            Request(
                "GET",
                "https://accounts.spotify.com/authorize?",
                params={
                    "scope": scopes,
                    "response_type": "code",
                    "redirect_uri": REDIRECT_URI,
                    "client_id": CLIENT_ID,
                },
            )
            .prepare()
            .url
        )

        return Response({"url": url}, status=status.HTTP_200_OK)


def spotify_callback(request, format=None):
    code = request.GET.get("code")
    error = request.GET.get("error")

    response = post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    ).json()

    access_token = response.get("access_token")
    token_type = response.get("token_type")
    refresh_token = response.get("refresh_token")
    expires_in = response.get("expires_in")
    error = response.get("error")

    if not request.session.exists(request.session.session_key):
        request.session.create()

    update_or_create_user_tokens(
        request.session.session_key, access_token, token_type, expires_in, refresh_token
    )
    return redirect("frontend:")


class IsAuthenticated(APIView):
    def get(self, request, format=None):
        is_authenticated = is_spotify_authenticated(self.request.session.session_key)
        return Response({"status": is_authenticated}, status=status.HTTP_200_OK)


class CurrentSong(APIView):
    def get(self, request, format=None):
        # Retrieve room code from session
        room_code = self.request.session.get("room_code")

        # Retrieve room object based on room code
        room = Room.objects.filter(
            code=room_code
        ).first()  # Use .first() to avoid IndexError

        if room is None:
            logger.warning(f"Room with code {room_code} does not exist.")
            return Response(
                {"detail": "Room not found."}, status=status.HTTP_404_NOT_FOUND
            )

        host = room.host
        endpoint = "player/currently-playing"

        # Execute request to Spotify API
        response = execute_spotify_api_request(host, endpoint)

        # Check if the response has an error or the expected 'item'
        if not response or "error" in response or "item" not in response:
            logger.info(
                "No current song playing or an error occurred with the Spotify API."
            )
            return Response({}, status=status.HTTP_204_NO_CONTENT)

        # Extract song details
        item = response.get("item")
        duration = item.get("duration_ms")
        progress = response.get("progress_ms")
        album_cover = (
            item.get("album", {}).get("images", [{}])[0].get("url", None)
        )  # Use safe get
        is_playing = response.get("is_playing")
        song_id = item.get("id")

        # Create a formatted string of artist names
        artist_string = ", ".join(
            artist.get("name") for artist in item.get("artists", [])
        )

        # Construct the song dictionary
        song = {
            "title": item.get("name"),
            "artist": artist_string,
            "duration": duration,
            "time": progress,
            "image_url": album_cover,
            "is_playing": is_playing,
            "votes": 0,
            "id": song_id,
        }

        logger.info(f"Successfully retrieved current song: {song}")
        return Response(song, status=status.HTTP_200_OK)


class PauseSong(APIView):
    def put(self, response, format=None):
        room_code = self.request.session.get("room_code")
        room = Room.objects.filter(code=room_code)[0]

        if not room_code:
            return Response(
                {"message": "Room code not found in session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room = Room.objects.filter(code=room_code).first()
        if not room:
            return Response(
                {"message": "Room not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if the user is the host or guest can pause
        if self.request.session.session_key == room.host or room.guest_can_pause:
            pause_song(room.host)
            return Response({}, status=status.HTTP_204_NO_CONTENT)

        return Response({}, status=status.HTTP_403_FORBIDDEN)


class PlaySong(APIView):
    def put(self, response, format=None):
        room_code = self.request.session.get("room_code")
        room = Room.objects.filter(code=room_code)[0]
        if not room_code:
            return Response(
                {"message": "Room code not found in session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room = Room.objects.filter(code=room_code).first()
        if not room:
            return Response(
                {"message": "Room not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if the user is the host or guest can play
        if self.request.session.session_key == room.host or room.guest_can_pause:
            play_song(room.host)
            return Response({}, status=status.HTTP_204_NO_CONTENT)

        return Response({}, status=status.HTTP_403_FORBIDDEN)
