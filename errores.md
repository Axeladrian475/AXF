
PS C:\Users\axela\Desktop\WORKSPACE\AXF> cd .\axf_frontend\
PS C:\Users\axela\Desktop\WORKSPACE\AXF\axf_frontend> npm run build                                   
                                                                                                      
> axf@0.0.0 build                                                                                     
> tsc -b && vite build

src/pages/entrenamiento/secciones/CrearRutina.tsx:494:24 - error TS6133: 'e' is declared but its value is never read.

494               onDrop={(e) => {
                           ~

src/pages/sucursales/Sucursales.tsx:17:35 - error TS2367: This comparison appears to be unintentional because the types 'number | boolean | undefined' and 'string' have no overlap.

17   return v === true || v === 1 || v === '1'
                                     ~~~~~~~~~

src/pages/sucursales/Sucursales.tsx:253:9 - error TS18048: 'formModificar.password' is possibly 'undefined'.

253     if (formModificar.password.trim()) {
            ~~~~~~~~~~~~~~~~~~~~~~

src/pages/sucursales/Sucursales.tsx:254:39 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

254       const errPass = validarPassword(formModificar.password, formModificar.usuario)
                                          ~~~~~~~~~~~~~~~~~~~~~~

src/pages/sucursales/Sucursales.tsx:476:46 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.

476                   <PasswordStrengthIndicator password={formAgregar.password} usuario={formAgregar.usuario} />
                                                 ~~~~~~~~

  src/components/PasswordStrengthIndicator.tsx:11:3
    11   password: string
         ~~~~~~~~
    The expected type comes from property 'password' which is declared here on type 'IntrinsicAttributes & Props'

src/pages/sucursales/Sucursales.tsx:725:48 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.

725                     <PasswordStrengthIndicator password={formModificar.password} usuario={formModificar.usuario} />
                                                   ~~~~~~~~

  src/components/PasswordStrengthIndicator.tsx:11:3
    11   password: string
         ~~~~~~~~
    The expected type comes from property 'password' which is declared here on type 'IntrinsicAttributes & Props'

src/pages/suscripciones/tabs/TabsAdministrarSuscripcion.tsx:317:15 - error TS2339: Property 'solo_sesiones' does not exist on type '{ message: string; id_suscripcion: number; fecha_inicio: string; fecha_fin: string; acumulada: boolean; }'.

317       if (res.solo_sesiones) {
                  ~~~~~~~~~~~~~


Found 7 errors.

PS C:\Users\axela\Desktop\WORKSPACE\AXF\axf_frontend> 