/** Sending an action or a scenario of a project to the model; shared by the Actions, Scenarios and Play screens. */
import type { LinkController } from '@/ble/LinkController';
import { isSequence } from '@/project/actions';
import { actionSteps, scenarioPlan, sequenceRows } from '@/project/outputs';
import type { Action, Project, Scenario } from '@/project/types';

// Each resolves to null on success or an error code: the link's ('not_connected', 'too_long', …) or 'failed' when
// the project's outputs can't be worked out.

export async function runAction(link: LinkController, project: Project, action: Action): Promise<string | null> {
  const exclusive = action.exclusive === true;
  if (isSequence(action)) {
    const rows = sequenceRows(project.boards, project.devices, action);
    return rows ? link.runSequence(action.id, exclusive, action.loop === true, rows) : 'failed';
  }
  const steps = actionSteps(project.boards, project.devices, action);
  return steps ? link.runAction(action.id, exclusive, steps) : 'failed';
}

export async function runScenario(link: LinkController, project: Project, scenario: Scenario): Promise<string | null> {
  const plan = scenarioPlan(project.boards, project.devices, project.actions, scenario);
  if (!plan) return 'failed';
  return link.runScenario(scenario.id, scenario.exclusive === true, scenario.loop === true, plan.actions, plan.rows);
}
