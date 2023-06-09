import { RealtimeChannel, createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { average } from "./array";
import { nearestFibonacci } from "./fibonacci";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

type Estimator = { id: string; username: string; estimation: number };
type PresenceState = { username: string; estimation: number };

function App() {
  const [roomTitle, setRoomTitle] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [estimation, setEstimation] = useState<number>(0);

  const [users, setUsers] = useState<Estimator[] | null>(null);

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const estimationSelectRef = useRef<HTMLSelectElement>(null);

  const avg: number = useMemo(
    () => (users ? average(users.map(({ estimation }) => estimation)) : 0),
    [users]
  );

  const nearestFib: number = useMemo(() => nearestFibonacci(avg), [avg]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const roomTitle = searchParams.get("room_title");
    if (roomTitle) {
      setRoomTitle(roomTitle);
    }
  }, []);

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
        setChannel(null);
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomTitle, username]);

  const beforeUnloadHandler = useCallback(() => {
    if (channel === null) return;
    supabase.removeChannel(channel);
  }, [channel]);

  useEffect(() => {
    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [beforeUnloadHandler]);

  useEffect(() => {
    if (channel === null) return;
    const payload: PresenceState = { username, estimation };
    channel.track(payload);
    () => {
      channel.untrack();
    };
  }, [channel, estimation, username]);

  useEffect(() => {
    if (channel === null) return;
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

  const keyupHandler = useCallback(
    (e: KeyboardEvent) => {
      if (channel === null) return;
      if (e.target !== document.body) return;
      if (e.key !== " ") return;
      channel.send({ type: "broadcast", event: "clearEstimation" });
    },
    [channel]
  );

  useEffect(() => {
    document.addEventListener("keyup", keyupHandler);
    return () => {
      document.removeEventListener("keyup", keyupHandler);
    };
  }, [keyupHandler]);

  useEffect(() => {
    if (channel === null) return;
    channel.on("broadcast", { event: "clearEstimation" }, () => {
      const el = estimationSelectRef.current;
      if (el) el.selectedIndex = 0;
    });
  }, [channel]);

  const handleChangeRoomTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoomTitle(e.currentTarget.value);
    },
    []
  );
  const handleChangeUsername = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(e.currentTarget.value);
    },
    []
  );
  const handleChangeEstimation = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEstimation(parseInt(e.currentTarget.value));
    },
    []
  );
  const handleClickCopyAverageButton = useCallback(() => {
    navigator.clipboard.writeText(avg.toFixed());
  }, [avg]);
  const handleClickCopyNearestFibButton = useCallback(() => {
    navigator.clipboard.writeText(nearestFib.toFixed());
  }, [nearestFib]);

  return (
    <div>
      <div>
        <label htmlFor="room_title">Room Title:&nbsp;</label>
        <input
          type="text"
          name="room_title"
          id="room_title"
          onChange={handleChangeRoomTitle}
          defaultValue={roomTitle}
        />
      </div>
      <div>
        <label htmlFor="username">Username:&nbsp;</label>
        <input
          type="text"
          name="username"
          id="username"
          onChange={handleChangeUsername}
        />
      </div>
      <div>
        <label htmlFor="estimation">Your Estimation:&nbsp;</label>
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
      <div>Connection status: {channel ? "connected" : "disconnected"}</div>
      <div>Number of Users:&nbsp;{users?.length ?? 0}</div>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            <div>Username:&nbsp;{user.username}</div>
            <div>Estimation:&nbsp;{user.estimation}</div>
          </li>
        ))}
      </ul>
      <div>
        Average:&nbsp;
        {avg}
        <button onClick={handleClickCopyAverageButton}>Copy Average</button>
      </div>
      <div>
        Nearest Fibonacci Number:&nbsp;
        {nearestFib}
        <button onClick={handleClickCopyNearestFibButton}>
          Copy Nearest Fibonacci Number
        </button>
      </div>
    </div>
  );
}

export default App;
