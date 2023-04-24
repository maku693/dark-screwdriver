import { RealtimeChannel, createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const estimationSelectRef = useRef<HTMLSelectElement>(null);
  const handleChangeEstimation = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEstimation(parseInt(e.currentTarget.value));
    },
    []
  );

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
      const el = estimationSelectRef.current;
      if (el) el.selectedIndex = 0;
    });
  }, [channel]);

  return (
    <div>
      <div>
        <label htmlFor="room_title">Room Title</label>
        <input
          type="text"
          name="room_title"
          id="room_title"
          onChange={handleChangeRoomTitle}
        />
      </div>
      <div>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          name="username"
          id="username"
          onChange={handleChangeUsername}
        />
      </div>
      <div>
        <label htmlFor="estimation">Your estimation:&nbsp;</label>
        <select
          name="estimation"
          id="estimation"
          onChange={handleChangeEstimation}
          ref={estimationSelectRef}
        >
          <option value={0}></option>
          {[1, 2, 3, 5, 8, 13, 21, 34].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
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
