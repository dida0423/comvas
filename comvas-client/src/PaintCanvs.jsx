import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";

export default function PaintCanvas({ onExport }) {
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const ws = useRef(null);

  const colors = ["blue", "red", "green"];
  const [currentColor, setCurrentColor] = useState(0);
  const [colorsDrawn, setColorsDrawn] = useState([]);

    useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8081");
    }, []);

    function sendToWS(data) {
    ws.current.send(JSON.stringify(data));      
    }

    async function sendToMax(data) {
        console.log("SENDING TO MAX:", data);
        await fetch("http://localhost:2112", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      


  // --------------------
  // Drawing logic
  // --------------------
  const handleMouseDown = (e) => {
    if (currentColor >= colors.length) 
        return;
    isDrawing.current = true;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    setLines((prev) => [
      ...prev,
      {
        color: colors[currentColor],
        strokeWidth: 3,
        points: [pos.x, pos.y],
        timestamps: [performance.now()],
      },
    ]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setLines((prev) => {
      const last = prev[prev.length - 1];

      const updated = {
        ...last,
        points: [...last.points, point.x, point.y],
        timestamps: [...last.timestamps, performance.now()],
      };

      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    if (currentColor < colors.length) setColorsDrawn((prev) => {
      const updated = [...prev, currentColor];
      console.log("colors drawn: " + updated);
      
      // Find next color that hasn't been drawn yet
      for (let i = 0; i <= colors.length; i++) {
        console.log("colors drawn: " + updated + " i: " + i);
        if (!updated.includes(i)) {
          setCurrentColor(i);
          break;
        }
      }
      
      return updated;
    });
  };

  const handleRedraw = (redrawColor) => {
    setCurrentColor(redrawColor);
    setColorsDrawn((prev) => {
      const updated = prev.filter((color) => color !== redrawColor);
      return updated;
    });
    // remove color from lines
    setLines(lines.filter((line) => line.color !== colors[redrawColor]));
    // remove from stage
  }

  const SetText = () => {
    if (currentColor < colors.length) {
      return (
        <h2
        style={{ color: colors[currentColor] }}
        >Draw one {colors[currentColor]} stroke</h2>
      );
    } else {
      return (
        <h2>Click submit!</h2>
      );
    }
  }

  const clearCanvas = () => {
    setLines([]);
    setColorsDrawn([]);
    setCurrentColor(0);
  }

  // --------------------
  // Export Logic
  // --------------------

  const exportStrokes = () => {
    const processed = lines.map((line) => {
      const pairs = [];
      for (let i = 0; i < line.points.length; i += 2) {
        pairs.push({ x: line.points[i], y: line.points[i + 1] });
      }

      return {
        color: line.color,
        width: line.strokeWidth,
        points: pairs,
        length: getLength(pairs),
        avgSpeed: getAvgSpeed(pairs, line.timestamps),
        avgCurvature: getAvgCurvature(pairs),
      };
    });

    const exportData = {
      canvas: { width: 800, height: 600 },
      strokes: processed,
    };

    console.log("EXPORT JSON:", exportData);

    return exportData;
  };

  return (
    <div>
        {SetText()}
      <Stage
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ border: "1px solid #ccc" }}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>

      
      <button
        onClick={() => handleRedraw(0)}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Blue
      </button>
      <button
        onClick={() => handleRedraw(1)}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Red
      </button>
      <button
        onClick={() => handleRedraw(2)}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Green
      </button>

      <button
        onClick={exportStrokes}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Export Drawing JSON
      </button>

      <button
        onClick={clearCanvas}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Clear Canvas
      </button>

      <button
        onClick={() => sendToGPT(exportStrokes())}
        style={{ marginTop: "10px", border: "1px solid black" }}
      >
        Send to GPT
      </button>
      <button onClick={() => sendToMax(exportStrokes())}>
        Send to Max
      </button>
    </div>
  );
}

//
// UTILITIES
//
function getLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function getAvgSpeed(points, timestamps) {
  if (points.length < 2) return 0;

  let total = 0;
  let count = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const dt = timestamps[i] - timestamps[i - 1];
    if (dt > 0) {
      total += dist / dt;
      count++;
    }
  }

  return total / count;
}

function getAvgCurvature(points) {
  if (points.length < 3) return 0;

  let total = 0;
  let count = 0;

  for (let i = 2; i < points.length; i++) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];

    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.hypot(v1.x, v1.y);
    const m2 = Math.hypot(v2.x, v2.y);

    if (m1 === 0 || m2 === 0) continue;

    const angle = Math.acos(Math.min(1, Math.max(-1, dot / (m1 * m2))));
    total += angle;
    count++;
  }

  return count > 0 ? total / count : 0;
}

async function sendToGPT(data) {
    console.log("SENDING TO GPT:", data);
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        input: `Convert this stroke data into a 2-bar melody: ${JSON.stringify(data)}`
      })
    });

    const out = await res.json();
    console.log(out);

  }
  

