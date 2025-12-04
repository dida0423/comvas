inlets = 1;
outlets = 3;

// outlet 0 = note
// outlet 1 = velocity
// outlet 2 = duration (ms)

var task = null;
var currentIndex = 0;
var sequence = [];

function anything()
{
    var args = arrayfromargs(arguments);

	var note = args[0];
	
	post(note);
	post(typeof(note));
	post(note.note);
	post(note.duration);
	post(note.velocity);

    if (args.length === 1 && args[0] instanceof Array) {

        sequence = args[0]; 
        post("Received array of length:", sequence.length, "\n");

        if (sequence.length === 0) {
            post("Empty array.\n");
            return;
        }

        currentIndex = 0;
        step();
    }
    else {
        post("Unhandled message:", messagename, "\n");
    }
}

function step()
{
    if (currentIndex >= sequence.length) {
        task = null;
        return;
    }

    var item = sequence[currentIndex];

    var note = item.note;
    var velocity = item.velocity;
    var dur_ms = item.duration * 1000;

    outlet(0, note);
    outlet(1, velocity);
    outlet(2, dur_ms);

    currentIndex++;

    task = new Task(step, this);
    task.schedule(dur_ms);
}

function stop()
{
    if (task !== null) {
        task.cancel();
        task = null;
    }
}
