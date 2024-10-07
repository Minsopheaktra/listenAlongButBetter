import React, { useState, useEffect, useCallback } from "react";
import { Grid, Button, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import CreateRoomPage from "./CreateRoomPage";
import MusicPlayer from "./MusicPlayer";

function Room({ leaveRoomCallback }) {
	const [votesToSkip, setVotesToSkip] = useState(2);
	const [guestCanPause, setGuestCanPause] = useState(false);
	const [isHost, setIsHost] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(false);
	const [song, setSong] = useState({});

	const { roomCode } = useParams();
	const navigate = useNavigate();

	useEffect(() => {
		const intervalId = setInterval(getCurrentSong, 1000);
		return () => clearInterval(intervalId);
	}, []);

	const updateSongStatus = (isPlaying) => {
		setSong((prevSong) => ({
			...prevSong,
			is_playing: isPlaying,
		}));
	};

	const getRoomDetails = useCallback(async () => {
		try {
			const response = await fetch(`/api/get-room?code=${roomCode}`);
			if (!response.ok) {
				throw new Error("Room not found");
			}
			const data = await response.json();
			setVotesToSkip(data.votes_to_skip);
			setGuestCanPause(data.guest_can_pause);
			setIsHost(data.is_host);
		} catch (error) {
			console.error("Error fetching room details:", error);
			leaveRoomCallback();
			navigate("/");
		}
	}, [roomCode, leaveRoomCallback, navigate]);

	const getCurrentSong = () => {
		fetch("/spotify/current-song")
			.then((response) => {
				if (!response.ok) {
					// If the response is not ok, return an empty object
					return {};
				}
				// Check if there's content to parse
				if (response.status === 204) {
					// No content returned (e.g., 204 No Content)
					return {};
				}
				return response.json();
			})
			.then((data) => {
				setSong(data);
			})
			.catch((error) => {
				console.error("Error fetching current song:", error);
			});
	};

	const authenticateSpotify = useCallback(async () => {
		try {
			const response = await fetch("/spotify/is-authenticated");
			const data = await response.json();
			setSpotifyAuthenticated(data.status);
			if (!data.status) {
				const authResponse = await fetch("/spotify/get-auth-url");
				const authData = await authResponse.json();
				window.location.replace(authData.url);
			}
		} catch (error) {
			console.error("Error authenticating with Spotify:", error);
		}
	}, []);

	useEffect(() => {
		getRoomDetails();
	}, [getRoomDetails]);

	useEffect(() => {
		if (isHost) {
			authenticateSpotify();
		}
	}, [isHost, authenticateSpotify]);

	const leaveButtonPressed = async () => {
		try {
			const requestOptions = {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			};
			await fetch("/api/leave-room", requestOptions);
			leaveRoomCallback();
			navigate("/");
		} catch (error) {
			console.error("Error leaving room:", error);
		}
	};

	const renderSettingsButton = () => (
		<Grid item xs={12} align="center">
			<Button
				variant="contained"
				color="primary"
				onClick={() => setShowSettings(true)}
			>
				Settings
			</Button>
		</Grid>
	);

	const renderSettings = () => (
		<Grid container spacing={1}>
			<Grid item xs={12} align="center">
				<CreateRoomPage
					update={true}
					votesToSkip={votesToSkip}
					guestCanPause={guestCanPause}
					roomCode={roomCode}
					updateCallback={getRoomDetails}
				/>
			</Grid>
			<Grid item xs={12} align="center">
				<Button
					variant="contained"
					color="secondary"
					onClick={() => setShowSettings(false)}
				>
					Close
				</Button>
			</Grid>
		</Grid>
	);

	if (showSettings) {
		return renderSettings();
	}

	return (
		<Grid container spacing={1}>
			<Grid item xs={12} align="center">
				<Typography variant="h4" component="h4">
					Code: {roomCode}
				</Typography>
			</Grid>
			<MusicPlayer {...song} updateSongStatus={updateSongStatus} />
			{isHost && renderSettingsButton()}
			<Grid item xs={12} align="center">
				<Button
					variant="contained"
					color="secondary"
					onClick={leaveButtonPressed}
				>
					Leave Room
				</Button>
			</Grid>
		</Grid>
	);
}

export default Room;
