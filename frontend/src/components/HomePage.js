import React, { useState, useEffect, useCallback } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import RoomJoinPage from "./RoomJoinPage";
import CreateRoomPage from "./CreateRoomPage";
import Room from "./Room";
import HomePageContent from "./HomePageContent";

function HomePage() {
	const [roomCode, setRoomCode] = useState(null);

	useEffect(() => {
		fetch("/api/user-in-room")
			.then((response) => response.json())
			.then((data) => {
				setRoomCode(data.code);
			});
	}, []);

	const clearRoomCode = useCallback(() => {
		setRoomCode(null);
	}, []);

	return (
		<Router>
			<Routes>
				<Route
					path="/"
					element={
						roomCode ? (
							<Navigate to={`/room/${roomCode}`} replace />
						) : (
							<HomePageContent />
						)
					}
				/>
				<Route path="/join" element={<RoomJoinPage />} />
				<Route path="/create" element={<CreateRoomPage />} />
				<Route
					path="/room/:roomCode"
					element={<Room leaveRoomCallback={clearRoomCode} />}
				/>
			</Routes>
		</Router>
	);
}

export default HomePage;
