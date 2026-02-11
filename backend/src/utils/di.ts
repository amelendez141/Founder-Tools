/**
 * Dependency Injection container — single source of truth for service instances.
 *
 * LOGIC-6 fix: eliminates multiple VentureService/UserService instances
 * across route modules that could diverge if state is ever cached.
 */

import { UserService } from "../services/user.service";
import { VentureService } from "../services/venture.service";
import { PhaseService } from "../services/phase.service";
import { AICopilotService } from "../services/ai-copilot.service";
import { AnonymousChatService } from "../services/anonymous-chat.service";

const userService = new UserService();
const ventureService = new VentureService();
const phaseService = new PhaseService(ventureService);
const aiService = new AICopilotService(undefined, userService, ventureService);
const anonymousChatService = new AnonymousChatService();

export { userService, ventureService, phaseService, aiService, anonymousChatService };
