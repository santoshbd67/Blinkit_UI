var person = { firstName: 'kanak', lastName: 'shukla', age: 30, behaviour: { type: 'good' } }

let clonedPerson = { ...person, gender: 'male' };


person.behaviour.type = "bad";

const utilityMethod = (originalObj) => {

    let clonedObj = {};
    if (originalObj) {
        Object.entries(originalObj).map(item => {
            if (typeof item == object) {

            }
            else {
                clonedObj[item] = item;
            }
        })
    }
    return clonedObj;
}
console.log(utilityMethod(person));
