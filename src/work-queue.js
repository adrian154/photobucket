// createPipeline accepts a task handler function and returns an enqueue function
module.exports = {
    createPipeline: (handleTaskFn, handleErr) => {
        let working = false;
        const queue = [];
        return async (newTask) => {

            // add task to queue
            queue.push(newTask);

            // if worker loop is already running, no need to do anything else
            if(working) {
                return;
            }

            // otherwise, begin draining queue
            working = true;
            while(queue.length > 0) {
                const todoTask = queue.shift();
                try {
                    await handleTaskFn(todoTask);
                } catch(err) {
                    handleErr(err, todoTask);
                }
            }

            // done - unset working flag and return
            working = false;

        };
    }
};