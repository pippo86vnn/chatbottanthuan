fetch(process.env.GAS_API_URL).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.data.administrativeProcedures, null, 2))).catch(e=>console.error(e));
