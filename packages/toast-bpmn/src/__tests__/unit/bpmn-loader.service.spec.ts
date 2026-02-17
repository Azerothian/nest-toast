import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BpmnLoaderService } from '../../services/bpmn-loader.service';
import { BpmnLoaderError } from '../../errors/bpmn-loader.error';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

// Mock bpmn-moddle
vi.mock('bpmn-moddle', () => {
  const mockFromXML = vi.fn();
  const MockBpmnModdle = vi.fn(() => ({ fromXML: mockFromXML }));
  return { default: MockBpmnModdle, __mockFromXML: mockFromXML };
});

// Mock the extension JSON import
vi.mock('../../schema/toast-extension.json', () => ({
  default: { name: 'Toast', uri: 'http://toast', prefix: 'toast', xml: { tagAlias: 'lowerCase' }, types: [] },
}));

function buildMockDefinition(overrides: { processes?: any[] } = {}) {
  const processes = overrides.processes ?? [
    {
      $type: 'bpmn:Process',
      id: 'TestProcess',
      name: 'Test Process',
      flowElements: [
        { $type: 'bpmn:StartEvent', id: 'start1', name: 'Start', outgoing: [{ id: 'flow1' }] },
        { $type: 'bpmn:EndEvent', id: 'end1', name: 'End', incoming: [{ id: 'flow2' }] },
        {
          $type: 'bpmn:ServiceTask',
          id: 'task1',
          name: 'My Task',
          extensionElements: {
            values: [{ $type: 'toast:TaskConfig', chainEventName: 'myEvent', inputType: 'OrderData' }],
          },
        },
        {
          $type: 'bpmn:SequenceFlow',
          id: 'flow1',
          sourceRef: { id: 'start1' },
          targetRef: { id: 'task1' },
        },
        {
          $type: 'bpmn:SequenceFlow',
          id: 'flow2',
          sourceRef: { id: 'task1' },
          targetRef: { id: 'end1' },
        },
      ],
    },
  ];

  return {
    rootElement: {
      rootElements: processes,
    },
  };
}

describe('BpmnLoaderService', () => {
  let service: BpmnLoaderService;
  let mockFromXML: ReturnType<typeof vi.fn>;
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockReaddir: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked fs functions
    const fsMock = await import('fs/promises');
    mockReadFile = fsMock.readFile as unknown as ReturnType<typeof vi.fn>;
    mockReaddir = fsMock.readdir as unknown as ReturnType<typeof vi.fn>;

    // Get mocked fromXML
    const bpmnModdle = await import('bpmn-moddle');
    const MockClass = bpmnModdle.default as unknown as ReturnType<typeof vi.fn>;
    mockFromXML = vi.fn().mockResolvedValue(buildMockDefinition());
    MockClass.mockImplementation(() => ({ fromXML: mockFromXML }));

    service = new BpmnLoaderService();
    await service.onModuleInit();
  });

  describe('loadFromString', () => {
    it('parses XML string and returns process definition', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.loadFromString('<bpmn:definitions/>', 'test-source');
      expect(def.name).toBe('TestProcess');
      expect(def.source).toBe('test-source');
    });

    it('extracts tasks from XML', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.loadFromString('<xml/>');
      expect(def.tasks).toHaveLength(1);
      expect(def.tasks[0].id).toBe('task1');
      expect(def.tasks[0].type).toBe('serviceTask');
      expect(def.tasks[0].chainEventName).toBe('myEvent');
    });

    it('extracts start and end events', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.loadFromString('<xml/>');
      expect(def.startEvents).toHaveLength(1);
      expect(def.startEvents[0].id).toBe('start1');
      expect(def.endEvents).toHaveLength(1);
      expect(def.endEvents[0].id).toBe('end1');
    });

    it('extracts sequence flows', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.loadFromString('<xml/>');
      expect(def.flows).toHaveLength(2);
      expect(def.flows[0].id).toBe('flow1');
      expect(def.flows[0].sourceRef).toBe('start1');
      expect(def.flows[0].targetRef).toBe('task1');
    });

    it('works without sourceName', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.loadFromString('<xml/>');
      expect(def.source).toBeUndefined();
    });
  });

  describe('load', () => {
    it('reads file and parses XML', async () => {
      mockReadFile.mockResolvedValueOnce('<bpmn:definitions/>');
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      const def = await service.load('/some/file.bpmn');
      expect(mockReadFile).toHaveBeenCalledWith('/some/file.bpmn', 'utf-8');
      expect(def.name).toBe('TestProcess');
      expect(def.source).toBe('/some/file.bpmn');
    });

    it('throws BpmnLoaderError when file read fails', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));
      await expect(service.load('/nonexistent.bpmn')).rejects.toBeInstanceOf(BpmnLoaderError);
    });

    it('rethrows BpmnLoaderError from parseXml', async () => {
      mockReadFile.mockResolvedValueOnce('<xml/>');
      mockFromXML.mockRejectedValueOnce(new Error('parse failure'));
      await expect(service.load('/bad.bpmn')).rejects.toBeInstanceOf(BpmnLoaderError);
    });
  });

  describe('loadDirectory', () => {
    it('loads all .bpmn files from a directory', async () => {
      mockReaddir.mockResolvedValueOnce(['a.bpmn', 'b.bpmn', 'readme.md']);
      mockReadFile.mockResolvedValue('<xml/>');
      mockFromXML
        .mockResolvedValueOnce(buildMockDefinition({ processes: [{ $type: 'bpmn:Process', id: 'ProcA', name: 'A', flowElements: [] }] }))
        .mockResolvedValueOnce(buildMockDefinition({ processes: [{ $type: 'bpmn:Process', id: 'ProcB', name: 'B', flowElements: [] }] }));

      const results = await service.loadDirectory('/bpmn-dir');
      expect(results).toHaveLength(2);
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('throws BpmnLoaderError when readdir fails', async () => {
      mockReaddir.mockRejectedValueOnce(new Error('EACCES: permission denied'));
      await expect(service.loadDirectory('/no-access')).rejects.toBeInstanceOf(BpmnLoaderError);
    });

    it('ignores non-.bpmn files', async () => {
      mockReaddir.mockResolvedValueOnce(['schema.json', 'README.md', 'process.xml']);
      const results = await service.loadDirectory('/bpmn-dir');
      expect(results).toHaveLength(0);
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe('getDefinition / hasDefinition / getAllDefinitions', () => {
    it('returns undefined for unknown definition', () => {
      expect(service.getDefinition('Unknown')).toBeUndefined();
    });

    it('returns false for hasDefinition on unknown name', () => {
      expect(service.hasDefinition('Unknown')).toBe(false);
    });

    it('stores and retrieves definition after load', async () => {
      mockFromXML.mockResolvedValueOnce(buildMockDefinition());
      await service.loadFromString('<xml/>');
      expect(service.hasDefinition('TestProcess')).toBe(true);
      expect(service.getDefinition('TestProcess')).toBeDefined();
    });

    it('getAllDefinitions returns all loaded definitions', async () => {
      mockFromXML
        .mockResolvedValueOnce(buildMockDefinition({ processes: [{ $type: 'bpmn:Process', id: 'P1', flowElements: [] }] }))
        .mockResolvedValueOnce(buildMockDefinition({ processes: [{ $type: 'bpmn:Process', id: 'P2', flowElements: [] }] }));
      await service.loadFromString('<xml/>', 'p1');
      await service.loadFromString('<xml/>', 'p2');
      const all = service.getAllDefinitions();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('throws BpmnLoaderError when fromXML fails', async () => {
      mockFromXML.mockRejectedValueOnce(new Error('invalid XML'));
      await expect(service.loadFromString('<invalid/>')).rejects.toBeInstanceOf(BpmnLoaderError);
    });

    it('throws BpmnLoaderError when no root elements', async () => {
      mockFromXML.mockResolvedValueOnce({ rootElement: { rootElements: [] } });
      await expect(service.loadFromString('<xml/>')).rejects.toBeInstanceOf(BpmnLoaderError);
    });

    it('throws BpmnLoaderError when no process definitions', async () => {
      mockFromXML.mockResolvedValueOnce({
        rootElement: {
          rootElements: [{ $type: 'bpmn:Collaboration' }],
        },
      });
      await expect(service.loadFromString('<xml/>')).rejects.toBeInstanceOf(BpmnLoaderError);
    });

    it('throws BpmnLoaderError when rootElement is null', async () => {
      mockFromXML.mockResolvedValueOnce({ rootElement: null });
      await expect(service.loadFromString('<xml/>')).rejects.toBeInstanceOf(BpmnLoaderError);
    });
  });

  describe('task type mapping', () => {
    const taskTypes = [
      { bpmnType: 'bpmn:UserTask', expected: 'userTask' },
      { bpmnType: 'bpmn:ScriptTask', expected: 'scriptTask' },
      { bpmnType: 'bpmn:SendTask', expected: 'sendTask' },
      { bpmnType: 'bpmn:ReceiveTask', expected: 'receiveTask' },
      { bpmnType: 'bpmn:ManualTask', expected: 'manualTask' },
      { bpmnType: 'bpmn:BusinessRuleTask', expected: 'businessRuleTask' },
      { bpmnType: 'bpmn:Task', expected: 'serviceTask' },
    ];

    for (const { bpmnType, expected } of taskTypes) {
      it(`maps ${bpmnType} to ${expected}`, async () => {
        mockFromXML.mockResolvedValueOnce(buildMockDefinition({
          processes: [{
            $type: 'bpmn:Process',
            id: 'P',
            flowElements: [
              { $type: 'bpmn:StartEvent', id: 's1', outgoing: [] },
              { $type: bpmnType, id: 't1', name: 'T' },
            ],
          }],
        }));
        const def = await service.loadFromString('<xml/>');
        expect(def.tasks[0].type).toBe(expected);
      });
    }
  });
});
