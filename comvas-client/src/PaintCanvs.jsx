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
      const currentLength = getLength(pairs);
      console.log(`Calculated length for a stroke: ${currentLength}`);
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

    const systemPrompt = `You are a creative assistant that converts visual data into a musical composition. Your task is to analyze the provided JSON object containing canvas stroke data and generate a list of MIDI notes for a 2-bar melody.

The stroke data contains properties like 'color', 'length', 'avgSpeed', and 'avgCurvature'. Use these properties to determine the pitch, duration, and velocity of the MIDI notes.

## 🎶 Conversion Rules

### 1. **CRITICAL SUBDIVISION RULE (10+ Notes Per Stroke):**

You must generate **a minimum of 10 MIDI notes for every single stroke** provided in the input data. The final output must contain at least 30 notes total.

To achieve this, perform segmentation based on the stroke's raw **'points'** array:
1.  **Determine the Segment Length (N):** Calculate the total number of points in the stroke's raw 'points' array. Divide this total point count by **10**. This value, **N**, is the number of points that define one segment (which corresponds to one MIDI note).
2.  **Generate $\ge 10$ Notes:** Iterate through the stroke's points array, generating a new MIDI note every time **N points** have been processed.

### 2. **Pitch Mapping (Note Number 0-127):**

* **Pitches** must be strictly limited to the **C Major Pentatonic** scale, but spanning a **three-octave range** (MIDI notes: **48 to 84**)
* The pitch of each of the $\ge 10$ notes must be determined by the **average y-coordinate** of the points within its segment (the N points).
* **Lower Y values (top of the canvas, 0-300) should map to a higher pitch** (e.g., 67-74).
* **Higher Y values (bottom of the canvas, 301-600) should map to a lower pitch** (e.g., 60-65).

### 3. **Duration Mapping (Rhythm via Density):**

* **Total Time Constraint:** The **total duration of all generated notes must not exceed 4.0** (two measures of 4/4 time).
* **Rhythmic Differentiation:** The duration of the notes generated from a stroke must be determined by the stroke's **relative 'length'** compared to the other two strokes.
    * **Longest Stroke:** The $\ge 10$ notes derived from this stroke must have the **shortest duration** (e.g., **0.075**).
    * **Medium Stroke:** The $\ge 10$ notes derived from this stroke must have a **medium duration** (e.g., **0.1**).
    * **Shortest Stroke:** The $\ge 10$ notes derived from this stroke must have the **longest duration** (e.g., **0.125**).

### 4. **Velocity Mapping (0-127):**

* Use the stroke's overall **'avgSpeed'** property to determine the velocity for **all** notes generated from that specific stroke. Faster strokes should have higher velocity.

## 📝 Output Format

**The final output MUST be a JSON array of objects**, where each object represents a single MIDI note and contains three keys: \`note\`, \`duration\`, and \`velocity\`. Do not include any other text, explanations, or code blocks in your response.

Example Output Format:
[
  { "note": 64, "duration": 0.257, "velocity": 85 },
  { "note": 67, "duration": 0.135, "velocity": 85 },
  // ... more notes, total of 30+
]`;

    const userPrompt = `Convert this stroke data into a 2-bar melody in C Major Pentatonic, following the rules above. Here is the data: ${JSON.stringify(data)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-nano", 
        messages: [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": userPrompt }
        ],
        // new var that requests a json obj
        response_format: { type: "json_object" } 
      })
    });

    const out = await res.json();
    console.log(out);

    // You would typically parse the MIDI notes from out.choices[0].message.content here
    try {
        const midiNotesString = out.choices[0].message.content;
        const midiNotes = JSON.parse(midiNotesString);
        console.log("GPT Generated MIDI Notes:", midiNotes);
        
        // 이건 뭐 send the generated MIDI notes to Max/MSP 할때 쓰는거라는데 사실 잘 모르겠음
        // await sendToMax({ midi_data: midiNotes }); 

    } catch (e) {
        console.error("Error parsing GPT response or response structure not found:", e, out);
    }
  }