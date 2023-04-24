import { RealtimeChannel, createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

type Estimator = { id: string; username: string; estimation: number | null };
type PresenceState = { username: string; estimation: number | null };

function App() {
  const [roomTitle, setRoomTitle] = useState<string>("");
  const handleChangeRoomTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoomTitle(e.currentTarget.value);
    },
    []
  );

  const [username, setUsername] = useState<string>("");
  const handleChangeUsername = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(e.currentTarget.value);
    },
    []
  );

  const [estimation, setEstimation] = useState<number | null>(null);
  useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      const i = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].findIndex(
        (v) => v === e.key
      );
      if (i > -1) {
        setEstimation(i);
      }
    };
    document.addEventListener("keydown", keydownHandler);
    return () => {
      document.removeEventListener("keydown", keydownHandler);
    };
  }, []);

  const [users, setUsers] = useState<Estimator[] | null>(null);

  const [channel, setChannel] = useState<RealtimeChannel>();
  useEffect(() => {
    if (roomTitle.length < 1) {
      return;
    }
    if (username.length < 1) {
      return;
    }
    const channel = supabase.channel(roomTitle, {
      config: {
        broadcast: {
          self: true,
        },
      },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setChannel(channel);
      } else {
        setChannel(undefined);
      }
    });
    return () => {
      channel.unsubscribe();
    };
  }, [roomTitle, username]);

  useEffect(() => {
    if (typeof channel === "undefined") return;
    const payload: PresenceState = { username, estimation };
    channel.track(payload);
    () => {
      channel.untrack();
    };
  }, [channel, estimation, username]);

  useEffect(() => {
    if (typeof channel === "undefined") return;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceState>();
      const presenceKeys = Object.keys(state);
      const users = new Array<Estimator>();
      for (const key of presenceKeys) {
        const { username, estimation } = state[key][0];
        users.push({
          id: key,
          username,
          estimation,
        });
      }
      setUsers(users);
    });
    return () => {
      setUsers(null);
    };
  }, [channel]);

  useEffect(() => {
    if (typeof channel === "undefined") return;
    const keyupHandler = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      if (e.key !== " ") return;
      channel.send({ type: "broadcast", event: "clearEstimation" });
    };
    document.addEventListener("keyup", keyupHandler);
    return () => {
      document.removeEventListener("keyup", keyupHandler);
    };
  }, [channel]);
  useEffect(() => {
    if (typeof channel === "undefined") return;
    channel.on("broadcast", { event: "clearEstimation" }, () => {
      setEstimation(null);
    });
  }, [channel]);

  return (
    <div>
      <div>
        <input
          type="text"
          name="room_title"
          id="room_title"
          placeholder="Room Title"
          onChange={handleChangeRoomTitle}
        />
      </div>
      <div>
        <input
          type="text"
          name="username"
          id="username"
          placeholder="Username"
          onChange={handleChangeUsername}
        />
      </div>
      <div>estimation:&nbsp;{estimation}</div>
      <div>number of users:&nbsp;{users?.length ?? 0}</div>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            <div>username:&nbsp;{user.username}</div>
            <div>estimation:&nbsp;{user.estimation}</div>
          </li>
        ))}
      </ul>
      <div>
        average:&nbsp;
        {users &&
          users.reduce((sum, user) => sum + (user.estimation ?? 0), 0) /
            users.length}
      </div>
    </div>
  );
}

export default App;
