# Phase 1: targeting teacher - student basic flow
1. Teacher:
   - [ ] Upload videos to local SQL database
   - [ ] Annotate videos with milestone markers
   - [ ] Mock questions (with no AI feature yet)

2. Student:
   - [ ] Watch interactive videos with milestone questions
   - [ ] Answer questions to progress through content

3. Errors
   - [ ] Upon completed the video, the video preview reverts to old states with 0 correct answers and no question states
   - [ ] Need a plan to refactor video preview: at least the state is centralized, but the preview video still has a bunch of problems.

## Problem 1: AI keeps overwriting working components
As AI keep overwriting working components, I need to understand which components it is intended to change based on [](./docs/arch/video-player-structure.md). The AI is very GRIT, it will slowly build the entire testing system to fix bugs. However, it needs architectural and coding principles guidance when it is too focused on one specific components and not the whole picture. The human can remember larger relevant context window than AI, so we should support them with out biological larger context window.

1. Confirm affected components? ask why?
2. Asking iteratively until a clear picture is provided
3. Proceed with the plan