export const sampleDiagramXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:toast="http://azerothian.io/schema/toast-bpmn"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">

  <bpmn:process id="Process_OrderFlow" isExecutable="true">
    <toast:processConfig
      version="1.0.0"
      description="Order processing workflow demonstrating toast-bpmn extensions"
      retryMaxRetries="3"
      retryBackoffMs="1000"
      retryBackoffMultiplier="2" />

    <bpmn:startEvent id="StartEvent_1" name="Order Received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:serviceTask id="Task_ValidateOrder" name="Validate Order">
      <toast:taskConfig
        chainEventName="OrderValidated"
        inputType="OrderInput"
        outputType="OrderOutput"
        timeout="5000" />
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:serviceTask id="Task_ProcessPayment" name="Process Payment">
      <toast:taskConfig
        chainEventName="PaymentProcessed"
        inputType="PaymentInput"
        outputType="PaymentOutput"
        timeout="10000" />
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:endEvent id="EndEvent_1" name="Order Complete">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_ValidateOrder" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ValidateOrder" targetRef="Task_ProcessPayment" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_ProcessPayment" targetRef="EndEvent_1" />
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_OrderFlow">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="128" y="125" width="84" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ValidateOrder_di" bpmnElement="Task_ValidateOrder">
        <dc:Bounds x="240" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ProcessPayment_di" bpmnElement="Task_ProcessPayment">
        <dc:Bounds x="392" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="544" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="519" y="125" width="87" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" />
        <di:waypoint x="240" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="100" />
        <di:waypoint x="392" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="492" y="100" />
        <di:waypoint x="544" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
