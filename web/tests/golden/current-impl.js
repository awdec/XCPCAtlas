// 被测实现：golden.test 用它重算并与基线比较。
// M0 阶段指向基线本身（自检）；M1-T3 起改为指向 src/domain 下的新实现。
export { default } from './reference-impl.js'
