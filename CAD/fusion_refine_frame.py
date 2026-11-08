import adsk.core, adsk.fusion
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
if not app.activeDocument.name.startswith('FrameCue FLUX'):
    raise RuntimeError('Open FrameCue first')
if any(root.occurrences.item(i).component.name == 'FLUX_StructureV3' for i in range(root.occurrences.count)):
    raise RuntimeError('StructureV3 already exists')
mgr = adsk.fusion.TemporaryBRepManager.get()
P = adsk.core.Point3D.create
dark = None
for i in range(root.occurrences.count):
    o = root.occurrences.item(i)
    if o.component.name == 'Left_Side_Rail':
        dark = o.component.bRepBodies.item(0).appearance
comp = root.occurrences.addNewComponent(adsk.core.Matrix3D.create()).component
comp.name = 'FLUX_StructureV3'
base = comp.features.baseFeatures.add()
base.startEdit()
def rod(name, a, b, radius, graphite=True, bore=0):
    shape = mgr.createCylinderOrCone(P(*a), radius, P(*b), radius)
    if bore:
        inner = mgr.createCylinderOrCone(P(*a), bore, P(*b), bore)
        mgr.booleanOperation(shape, inner, adsk.fusion.BooleanTypes.DifferenceBooleanType)
    body = comp.bRepBodies.add(shape, base)
    body.name = name
    if graphite and dark:
        body.appearance = dark
    return body
try:
    for side in (-1, 1):
        y = side*5.2
        path = [(2.2,y,3.0),(6.8,y,5.7),(15.7,y,6.35),(22.8,y,3.8),(25.4,y,2.6)]
        for i in range(len(path)-1):
            rod('Frame_Conduit_%s_%s'%(side,i), path[i], path[i+1], .24, True, .11)
        for x, z in [(6.8,5.7),(15.7,6.35),(22.8,3.8)]:
            rod('Frame_Junction_%s_%s'%(side,x),(x,y-.32,z),(x,y+.32,z),.34)
            rod('Frame_Fastener_%s_%s'%(side,x),(x,y+side*.33,z),(x,y+side*.43,z),.15,False)
    rod('Concealed_Feed_Controller',(7.5,-6.0,6.35),(8.0,-5.2,6.35),.24,True,.11)
    rod('Concealed_Feed_Crossmember',(15.65,-5.2,6.35),(15.65,5.2,6.35),.30,True,.13)
    for label,y in [('Left',-2.7),('Center',0),('Right',2.7)]:
        rod('Claw_Base_'+label,(15.85,y,6.35),(15.85,y,7.57),.28)
        for idx,(x0,x1,z,w) in enumerate([(15.85,18.3475,7.50,.82),(18.3475,20.9125,7.29,.70),(20.9125,23.32,7.08,.51)],1):
            for side in (-1,1):
                rod('Claw_%s_Finger_%s_Cheek_%s'%(label,idx,side),(x0,y+side*w,z),(x1,y+side*w*.72,z-.17),.105)
            if idx>1:
                for side in (-1,1):
                    rod('Claw_%s_Finger_%s_Bearing_%s'%(label,idx,side),(x0,y+side*.82,z-.05),(x0,y+side*1.00,z-.05),.255,False)
        rod('Claw_%s_Finger_3_ContactPad'%label,(23.02,y-.28,6.99),(23.02,y+.28,6.99),.22)
finally:
    base.finishEdit()
for i in range(root.occurrences.count):
    o = root.occurrences.item(i)
    if o.component.name.startswith('FLUX_ArmorV2_'):
        t = o.transform2
        v = t.translation
        v.z = .45
        t.translation = v
        o.transform2 = t
    if o.component.name.startswith('Pneumatic_Route_'):
        o.isLightBulbOn = False
    if o.component.name == 'Controller_Pod_Concept':
        for b in o.component.bRepBodies:
            if 'port' in b.name.lower() or 'shoulder' in b.name.lower():
                b.isLightBulbOn = False
app.activeViewport.refresh()
print('Created reinforced frame, hollow cable channels, claw bearings and contact pads')
